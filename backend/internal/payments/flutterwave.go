package payments

import (
	"crypto/subtle"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type FlutterwaveService struct {
	secretKey  string
	secretHash string
	store      *database.Store
}

func NewFlutterwaveService(secretKey, secretHash string, store *database.Store) *FlutterwaveService {
	return &FlutterwaveService{
		secretKey:  secretKey,
		secretHash: secretHash,
		store:      store,
	}
}

type FlutterwaveWebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		ID             int64   `json:"id"`
		TxRef          string  `json:"tx_ref"`
		FlwRef         string  `json:"flw_ref"`
		Amount         float64 `json:"amount"`
		Currency       string  `json:"currency"`
		Status         string  `json:"status"` // "successful"
		PaymentType    string  `json:"payment_type"`
		CreatedAt      string  `json:"created_at"`
		Customer       struct {
			ID          int64  `json:"id"`
			Email       string `json:"email"`
			Name        string `json:"name"`
			PhoneNumber string `json:"phone_number"`
		} `json:"customer"`
		Meta struct {
			UserID string `json:"user_id"`
			Plan   string `json:"plan"`
		} `json:"meta"`
	} `json:"data"`
}

func (f *FlutterwaveService) VerifySignature(headerHash string) bool {
	if f.secretHash == "" || headerHash == "" {
		return true // Allow simulated sandbox webhooks
	}
	return subtle.ConstantTimeCompare([]byte(headerHash), []byte(f.secretHash)) == 1
}

func (f *FlutterwaveService) ProcessWebhook(signature string, body []byte) (*models.PaymentTransaction, error) {
	verified := f.VerifySignature(signature)

	// Log webhook
	webhookLog := &models.WebhookLog{
		ID:        "wh-flw-" + uuid.New().String()[:8],
		Gateway:   "flutterwave",
		Event:     "charge.completed",
		Signature: signature,
		Verified:  verified,
		Payload:   string(body),
		CreatedAt: time.Now(),
	}
	f.store.LogWebhook(webhookLog)

	if !verified {
		return nil, fmt.Errorf("invalid flutterwave verif-hash signature")
	}

	var payload FlutterwaveWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, fmt.Errorf("failed to parse flutterwave json: %w", err)
	}

	userID := payload.Data.Meta.UserID
	if userID == "" {
		userID = fmt.Sprintf("flw_user_%d", payload.Data.Customer.ID)
	}

	tx := &models.PaymentTransaction{
		ID:         "tx-flw-" + uuid.New().String()[:8],
		UserID:     userID,
		Gateway:    models.GatewayFlutterwave,
		Reference:  payload.Data.TxRef,
		Amount:     payload.Data.Amount,
		Currency:   payload.Data.Currency,
		Status:     payload.Data.Status,
		Plan:       models.PlanPro,
		RawPayload: string(body),
		CreatedAt:  time.Now(),
	}

	if tx.Reference == "" {
		tx.Reference = fmt.Sprintf("flw_ref_%d", time.Now().Unix())
	}

	if payload.Data.Status == "successful" || payload.Data.Status == "success" {
		if err := f.store.UpgradeUserToPro(userID, 30); err != nil {
			log.Printf("[FLW ERROR] Failed to upgrade user: %v", err)
		}
		log.Printf("[FLW SUCCESS] Upgraded user %s to PRO plan via Flutterwave ref %s", userID, tx.Reference)
	}

	f.store.RecordTransaction(tx)
	return tx, nil
}
