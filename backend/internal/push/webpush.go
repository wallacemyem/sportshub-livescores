package push

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

var (
	ErrSubscriptionExpired = errors.New("push subscription has expired or unsubscribed")
	httpClient             = &http.Client{Timeout: 10 * time.Second}
)

// EncryptPayload encrypts a message for Web Push according to RFC 8291 (aes128gcm)
func EncryptPayload(plaintext []byte, p256dhB64, authB64 string) ([]byte, error) {
	recipPubBytes, err := DecodeBase64Url(p256dhB64)
	if err != nil {
		return nil, fmt.Errorf("invalid p256dh base64: %w", err)
	}
	if len(recipPubBytes) != 65 || recipPubBytes[0] != 0x04 {
		return nil, errors.New("invalid recipient public key length or format")
	}

	authSecret, err := DecodeBase64Url(authB64)
	if err != nil {
		return nil, fmt.Errorf("invalid auth base64: %w", err)
	}
	if len(authSecret) < 16 {
		return nil, errors.New("auth secret must be at least 16 bytes")
	}

	curve := elliptic.P256()

	// 1. Generate local ephemeral ECDSA keypair
	localPriv, err := ecdsa.GenerateKey(curve, rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ephemeral key: %w", err)
	}
	localPubBytes := elliptic.Marshal(curve, localPriv.PublicKey.X, localPriv.PublicKey.Y)

	// 2. Unmarshal recipient public key and compute ECDH shared secret
	recipX, recipY := elliptic.Unmarshal(curve, recipPubBytes)
	if recipX == nil || recipY == nil {
		return nil, errors.New("failed to unmarshal recipient public key")
	}

	sharedX, _ := curve.ScalarMult(recipX, recipY, localPriv.D.Bytes())
	ecdhSecret := make([]byte, 32)
	sharedX.FillBytes(ecdhSecret)

	// 3. Derive key material using HKDF (RFC 8291 section 3.2)
	authInfo := append([]byte("WebPush: info\x00"), recipPubBytes...)
	authInfo = append(authInfo, localPubBytes...)

	ikm := hkdfExtract(authSecret, ecdhSecret)
	prk := hkdfExpand(ikm, authInfo, 32)

	salt, err := randomBytes(16)
	if err != nil {
		return nil, fmt.Errorf("failed to generate salt: %w", err)
	}

	keyInfo := []byte("Content-Encoding: aes128gcm\x00")
	nonceInfo := []byte("Content-Encoding: nonce\x00")

	prkKey := hkdfExtract(salt, prk)
	cek := hkdfExpand(prkKey, keyInfo, 16)
	nonce := hkdfExpand(prkKey, nonceInfo, 12)

	// 4. AES-128-GCM encryption with 0x02 record delimiter
	block, err := aes.NewCipher(cek)
	if err != nil {
		return nil, fmt.Errorf("failed to create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("failed to create gcm: %w", err)
	}

	record := append(plaintext, 0x02) // RFC 8291 delimiter
	ciphertext := gcm.Seal(nil, nonce, record, nil)

	// 5. Assemble final header + ciphertext (aes128gcm format)
	// Header: salt (16) + rs (4) + idlen (1) + localPubBytes (65)
	buf := new(bytes.Buffer)
	buf.Write(salt)

	rs := uint32(4096)
	rsBytes := make([]byte, 4)
	binary.BigEndian.PutUint32(rsBytes, rs)
	buf.Write(rsBytes)

	buf.WriteByte(byte(len(localPubBytes)))
	buf.Write(localPubBytes)
	buf.Write(ciphertext)

	return buf.Bytes(), nil
}

// SendWebPush dispatches an encrypted Web Push notification to a browser push endpoint
func SendWebPush(endpoint, p256dhB64, authB64 string, payload []byte, vapid *VAPIDKeys, ttlSeconds int, urgency string) error {
	if endpoint == "" {
		return errors.New("empty push endpoint")
	}

	var body io.Reader
	var contentEncoding string
	var contentType string

	if len(payload) > 0 && p256dhB64 != "" && authB64 != "" {
		encrypted, err := EncryptPayload(payload, p256dhB64, authB64)
		if err != nil {
			return fmt.Errorf("encryption error: %w", err)
		}
		body = bytes.NewReader(encrypted)
		contentEncoding = "aes128gcm"
		contentType = "application/octet-stream"
	}

	req, err := http.NewRequest(http.MethodPost, endpoint, body)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	if vapid != nil {
		vapidHeader, err := vapid.GenerateVAPIDHeader(endpoint)
		if err != nil {
			return fmt.Errorf("vapid generation error: %w", err)
		}
		req.Header.Set("Authorization", vapidHeader)
	}

	if ttlSeconds <= 0 {
		ttlSeconds = 60
	}
	req.Header.Set("TTL", fmt.Sprintf("%d", ttlSeconds))

	if urgency == "" {
		urgency = "high"
	}
	req.Header.Set("Urgency", urgency)

	if contentEncoding != "" {
		req.Header.Set("Content-Encoding", contentEncoding)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusAccepted {
		return nil
	}

	// 404 or 410 indicates the push subscription is expired/cancelled by the browser
	if resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone {
		return ErrSubscriptionExpired
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("push service returned status %d: %s", resp.StatusCode, string(respBody))
}
