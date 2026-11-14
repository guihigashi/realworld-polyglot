package auth

import (
	"encoding/base64"
	"testing"
	"time"
	"uuid"

	"github.com/lestrrat-go/jwx/v4/jwa"
	"github.com/lestrrat-go/jwx/v4/jwt"
)

func signTestToken(t *testing.T, key []byte, sub, email, username string) string {
	t.Helper()
	tok, err := jwt.NewBuilder().
		Subject(sub).
		Claim("email", email).
		Claim("username", username).
		IssuedAt(time.Now()).
		Expiration(time.Now().Add(time.Hour)).
		Build()
	if err != nil {
		t.Fatalf("build token: %v", err)
	}
	signed, err := jwt.Sign(tok, jwt.WithKey(jwa.HS256(), key))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return string(signed)
}

func TestValidator_PlainSecret(t *testing.T) {
	secret := "7199d556e8d46a9927ae2a974feff00917c42955877e2df43939a5856d6ab15e"
	v := NewValidator(secret)
	userID := uuid.New().String()

	token := signTestToken(t, []byte(secret), userID, "hiccup@berk.org", "hiccup")
	claims, err := v.ParseAndValidate(token)
	if err != nil {
		t.Fatalf("expected valid token, got error: %v", err)
	}
	if claims.Subject.String() != userID || claims.Email != "hiccup@berk.org" || claims.Username != "hiccup" {
		t.Fatalf("unexpected claims: %+v", claims)
	}
}

func TestValidator_Base64PrefixedSecret(t *testing.T) {
	rawKey := []byte("0123456789abcdef0123456789abcdef")
	prefixed := "base64:" + base64.StdEncoding.EncodeToString(rawKey)
	v := NewValidator(prefixed)
	userID := uuid.New().String()

	token := signTestToken(t, rawKey, userID, "astrid@berk.org", "astrid")
	claims, err := v.ParseAndValidate(token)
	if err != nil {
		t.Fatalf("expected valid token for base64:-prefixed key, got error: %v", err)
	}
	if claims.Username != "astrid" {
		t.Fatalf("unexpected username: %s", claims.Username)
	}
}
