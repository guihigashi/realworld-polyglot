package auth

import (
	"fmt"
	"uuid"

	"github.com/lestrrat-go/jwx/v4/jwa"
	"github.com/lestrrat-go/jwx/v4/jwt"
)

type Claims struct {
	Subject  uuid.UUID `json:"sub"`
	Email    string    `json:"email"`
	Username string    `json:"username"`
}

type Validator struct {
	secret []byte
}

func NewValidator(secret string) *Validator {
	return &Validator{
		secret: []byte(secret),
	}
}

// ParseAndValidate parses and verifies the raw JWT token string using lestrrat-go/jwx.
// If valid, returns the Claims. If token is invalid or expired, returns an error.
func (v *Validator) ParseAndValidate(tokenStr string) (*Claims, error) {
	tok, err := jwt.ParseString(
		tokenStr,
		jwt.WithKey(jwa.HS256(), v.secret),
		jwt.WithValidate(true),
	)
	if err != nil {
		return nil, fmt.Errorf("invalid jwt token: %w", err)
	}

	sub, _ := tok.Subject()
	subject, err := uuid.Parse(sub)
	if err != nil {
		return nil, fmt.Errorf("invalid subject in jwt token: %w", err)
	}

	email, err := jwt.Get[string](tok, "email")
	if err != nil {
		return nil, fmt.Errorf("invalid email in jwt token: %w", err)
	}

	username, err := jwt.Get[string](tok, "username")
	if err != nil {
		return nil, fmt.Errorf("invalid username in jwt token: %w", err)
	}

	return &Claims{
		Subject:  subject,
		Email:    email,
		Username: username,
	}, nil
}
