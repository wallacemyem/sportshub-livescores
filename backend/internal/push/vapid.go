package push

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/url"
	"strings"
	"time"
)

// VAPIDKeys holds the ECDSA P-256 keypair for VAPID signing
type VAPIDKeys struct {
	PrivateKey *ecdsa.PrivateKey
	PublicKey  *ecdsa.PublicKey
	PublicB64  string
	PrivateB64 string
	Contact    string
}

// GenerateVAPIDKeys creates a new NIST P-256 keypair for Web Push VAPID
func GenerateVAPIDKeys(contact string) (*VAPIDKeys, error) {
	curve := elliptic.P256()
	privKey, err := ecdsa.GenerateKey(curve, rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("failed to generate ecdsa key: %w", err)
	}

	pubBytes := elliptic.Marshal(curve, privKey.PublicKey.X, privKey.PublicKey.Y)
	pubB64 := base64.RawURLEncoding.EncodeToString(pubBytes)

	dBytes := make([]byte, 32)
	privKey.D.FillBytes(dBytes)
	privB64 := base64.RawURLEncoding.EncodeToString(dBytes)

	if contact == "" {
		contact = "mailto:admin@slipradar.app"
	}

	return &VAPIDKeys{
		PrivateKey: privKey,
		PublicKey:  &privKey.PublicKey,
		PublicB64:  pubB64,
		PrivateB64: privB64,
		Contact:    contact,
	}, nil
}

// LoadVAPIDKeys parses base64url-encoded public and private keys
func LoadVAPIDKeys(pubB64, privB64, contact string) (*VAPIDKeys, error) {
	if pubB64 == "" || privB64 == "" {
		return nil, errors.New("empty vapid keys")
	}

	curve := elliptic.P256()

	pubBytes, err := base64.RawURLEncoding.DecodeString(pubB64)
	if err != nil {
		return nil, fmt.Errorf("invalid vapid public key base64: %w", err)
	}

	x, y := elliptic.Unmarshal(curve, pubBytes)
	if x == nil || y == nil {
		return nil, errors.New("invalid vapid public key point")
	}

	privBytes, err := base64.RawURLEncoding.DecodeString(privB64)
	if err != nil {
		return nil, fmt.Errorf("invalid vapid private key base64: %w", err)
	}

	d := new(big.Int).SetBytes(privBytes)
	privKey := &ecdsa.PrivateKey{
		PublicKey: ecdsa.PublicKey{
			Curve: curve,
			X:     x,
			Y:     y,
		},
		D: d,
	}

	if contact == "" {
		contact = "mailto:admin@slipradar.app"
	}

	return &VAPIDKeys{
		PrivateKey: privKey,
		PublicKey:  &privKey.PublicKey,
		PublicB64:  pubB64,
		PrivateB64: privB64,
		Contact:    contact,
	}, nil
}

// GenerateVAPIDHeader generates the Authorization: vapid ... header for an endpoint
func (k *VAPIDKeys) GenerateVAPIDHeader(endpoint string) (string, error) {
	parsedURL, err := url.Parse(endpoint)
	if err != nil {
		return "", fmt.Errorf("invalid endpoint url: %w", err)
	}

	origin := fmt.Sprintf("%s://%s", parsedURL.Scheme, parsedURL.Host)

	headerJSON, _ := json.Marshal(map[string]string{
		"typ": "JWT",
		"alg": "ES256",
	})
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	now := time.Now().Unix()
	payloadJSON, _ := json.Marshal(map[string]interface{}{
		"aud": origin,
		"exp": now + 43200, // 12 hours
		"sub": k.Contact,
	})
	payloadB64 := base64.RawURLEncoding.EncodeToString(payloadJSON)

	sigInput := headerB64 + "." + payloadB64
	hash := sha256.Sum256([]byte(sigInput))

	r, s, err := ecdsa.Sign(rand.Reader, k.PrivateKey, hash[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign vapid jwt: %w", err)
	}

	rBytes := make([]byte, 32)
	sBytes := make([]byte, 32)
	r.FillBytes(rBytes)
	s.FillBytes(sBytes)

	sigBytes := append(rBytes, sBytes...)
	sigB64 := base64.RawURLEncoding.EncodeToString(sigBytes)

	token := sigInput + "." + sigB64
	return fmt.Sprintf("vapid t=%s, k=%s", token, k.PublicB64), nil
}

// HKDF helper functions (RFC 5869)
func hkdfExtract(salt, ikm []byte) []byte {
	if len(salt) == 0 {
		salt = make([]byte, 32)
	}
	h := hmac.New(sha256.New, salt)
	h.Write(ikm)
	return h.Sum(nil)
}

func hkdfExpand(prk, info []byte, length int) []byte {
	var result []byte
	var t []byte
	counter := byte(1)

	for len(result) < length {
		h := hmac.New(sha256.New, prk)
		h.Write(t)
		h.Write(info)
		h.Write([]byte{counter})
		t = h.Sum(nil)
		result = append(result, t...)
		counter++
	}

	return result[:length]
}

// CleanBase64Url ensures base64url strings are unpadded
func CleanBase64Url(s string) string {
	s = strings.ReplaceAll(s, "+", "-")
	s = strings.ReplaceAll(s, "/", "_")
	return strings.TrimRight(s, "=")
}

// DecodeBase64Url decodes standard or URL-safe base64 with or without padding
func DecodeBase64Url(s string) ([]byte, error) {
	s = strings.ReplaceAll(s, "-", "+")
	s = strings.ReplaceAll(s, "_", "/")
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}
	return base64.StdEncoding.DecodeString(s)
}

// EnsureRandReader fills slice with cryptographically secure random bytes
func randomBytes(n int) ([]byte, error) {
	b := make([]byte, n)
	if _, err := io.ReadFull(rand.Reader, b); err != nil {
		return nil, err
	}
	return b, nil
}
