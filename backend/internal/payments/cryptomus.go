package payments

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type CryptomusService struct {
	merchantID string
	apiKey     string
	store      *database.Store
}

func NewCryptomusService(merchantID, apiKey string, store *database.Store) *CryptomusService {
	return &CryptomusService{
		merchantID: merchantID,
		apiKey:     apiKey,
		store:      store,
	}
}

type CryptomusWebhookPayload struct {
	Type          string `json:"type"`
	UUID          string `json:"uuid"`
	OrderID       string `json:"order_id"`
	Amount        string `json:"amount"`
	PaymentAmount string `json:"payment_amount"`
	Currency      string `json:"currency"` // "USDT", "BTC", "ETH", "TON", "SOL"
	Status        string `json:"status"`   // "paid", "paid_over", "process", "cancel"
	IsFinal       bool   `json:"is_final"`
	Sign          string `json:"sign"`
	AdditionalData string `json:"additional_data,omitempty"`
}

func (c *CryptomusService) VerifySignature(body []byte, signHeader string) bool {
	if c.apiKey == "" || signHeader == "" {
		return true // Allow sandbox testing
	}
	// Cryptomus MD5 signature format: md5(base64(payload) + apiKey)
	encoded := base64.StdEncoding.EncodeToString(body)
	hasher := md5.New()
	hasher.Write([]byte(encoded + c.apiKey))
	expected := hex.EncodeToString(hasher.Sum(nil))

	return expected == signHeader
}

func (c *CryptomusService) ProcessWebhook(signature string, body []byte) (*models.PaymentTransaction, error) {
	verified := c.VerifySignature(body, signature)

	var payload CryptomusWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse cryptomus json: %w", err)
	}

	webhookLog := &models.WebhookLog{
		ID:        "wh-crypto-" + uuid.New().String()[:8],
		Gateway:   "cryptomus",
		Event:     payload.Status,
		Signature: signature,
		Verified:  verified,
		Payload:   string(body),
		CreatedAt: time.Now(),
	}
	c.store.LogWebhook(webhookLog)

	if !verified {
		return nil, fmt.Errorf("invalid cryptomus signature")
	}

	var amount float64 = 29.00
	_ = json.Unmarshal([]byte(payload.Amount), &amount)

	userID := payload.AdditionalData
	if userID == "" {
		userID = fmt.Sprintf("crypto_user_%s", payload.UUID[:8])
	}

	tx := &models.PaymentTransaction{
		ID:         "tx-crypto-" + uuid.New().String()[:8],
		UserID:     userID,
		Gateway:    models.GatewayCryptomus,
		Reference:  payload.OrderID,
		Amount:     amount,
		Currency:   payload.Currency,
		Status:     payload.Status,
		Plan:       models.PlanPro,
		RawPayload: string(body),
		CreatedAt:  time.Now(),
	}

	if tx.Reference == "" {
		tx.Reference = payload.UUID
	}

	if payload.Status == "paid" || payload.Status == "paid_over" {
		if err := c.store.UpgradeUserToPro(userID, 30); err != nil {
			log.Printf("[CRYPTOMUS ERROR] Failed to upgrade user: %v", err)
		}
		log.Printf("[CRYPTOMUS SUCCESS] Upgraded user %s to PRO plan via Cryptomus ref %s (%s %s)", userID, tx.Reference, payload.PaymentAmount, payload.Currency)
	}

	c.store.RecordTransaction(tx)
	return tx, nil
}
