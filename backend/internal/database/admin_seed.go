package database

import (
	"time"

	"github.com/sports/livescores/internal/models"
	"golang.org/x/crypto/bcrypt"
)

// seedAdminPopulation ensures the system administrator account exists
// and is available in the store without creating any fake/demo records.
func (s *Store) seedAdminPopulation() {
	now := time.Now()

	// Seed system administrator
	adminHash, _ := bcrypt.GenerateFromPassword([]byte("AdminSecure2026!SlipRadar"), bcrypt.DefaultCost)
	adminUser := &models.User{
		ID:           "usr_admin_01",
		Email:        "admin@slipradar.com",
		Name:         "System Administrator",
		PasswordHash: string(adminHash),
		Role:         "admin",
		IsAdmin:      true,
		Plan:         models.PlanElite,
		Status:       models.UserActive,
		Country:      "US",
		SignupSource: "system_init",
		CreatedAt:    now.Add(-365 * 24 * time.Hour),
		LastSeenAt:   now,
	}
	s.users[adminUser.ID] = adminUser
}
