package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/sports/livescores/internal/models"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidToken = errors.New("invalid or malformed token")
	ErrExpiredToken = errors.New("token has expired")
	ErrSignature    = errors.New("invalid token signature")
)

type JWTClaims struct {
	UserID    string          `json:"sub"`
	Email     string          `json:"email"`
	Name      string          `json:"name"`
	Role      string          `json:"role"`
	IsAdmin   bool            `json:"is_admin"`
	Plan      models.UserPlan `json:"plan"`
	IssuedAt  int64           `json:"iat"`
	ExpiresAt int64           `json:"exp"`
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPassword(password, hash string) bool {
	if hash == "" {
		return false
	}
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GenerateToken(user *models.User, secret string) (string, error) {
	if secret == "" {
		secret = "slipradar_secure_jwt_secret_key_2026"
	}

	header := map[string]string{
		"alg": "HS256",
		"typ": "JWT",
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}

	now := time.Now()
	claims := JWTClaims{
		UserID:    user.ID,
		Email:     user.Email,
		Name:      user.Name,
		Role:      user.Role,
		IsAdmin:   user.IsAdmin,
		Plan:      user.Plan,
		IssuedAt:  now.Unix(),
		ExpiresAt: now.Add(7 * 24 * time.Hour).Unix(),
	}

	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encHeader := base64.RawURLEncoding.EncodeToString(headerJSON)
	encClaims := base64.RawURLEncoding.EncodeToString(claimsJSON)

	unsignedToken := fmt.Sprintf("%s.%s", encHeader, encClaims)

	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(unsignedToken))
	signature := h.Sum(nil)
	encSig := base64.RawURLEncoding.EncodeToString(signature)

	return fmt.Sprintf("%s.%s", unsignedToken, encSig), nil
}

func ValidateToken(tokenStr string, secret string) (*JWTClaims, error) {
	if secret == "" {
		secret = "slipradar_secure_jwt_secret_key_2026"
	}

	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	unsignedToken := fmt.Sprintf("%s.%s", parts[0], parts[1])
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(unsignedToken))
	expectedSig := h.Sum(nil)

	actualSig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, ErrInvalidToken
	}

	if !hmac.Equal(expectedSig, actualSig) {
		return nil, ErrSignature
	}

	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims JWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	if claims.ExpiresAt < time.Now().Unix() {
		return nil, ErrExpiredToken
	}

	return &claims, nil
}
