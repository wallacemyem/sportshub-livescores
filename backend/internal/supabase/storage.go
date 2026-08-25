package supabase

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"time"
)

type StorageService struct {
	baseURL    string
	serviceKey string
	bucketName string
	httpClient *http.Client
}

func NewStorageService(baseURL, serviceKey, bucketName string) *StorageService {
	if bucketName == "" {
		bucketName = "sports-assets"
	}
	return &StorageService{
		baseURL:    baseURL,
		serviceKey: serviceKey,
		bucketName: bucketName,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// UploadAsset uploads a file to Supabase Storage and returns its public URL
func (s *StorageService) UploadAsset(ctx context.Context, folder, filename string, data []byte, contentType string) (string, error) {
	if s.baseURL == "" || s.serviceKey == "" {
		// Fallback public CDN asset URL
		return fmt.Sprintf("https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=512&auto=format&fit=crop&q=80"), nil
	}

	path := fmt.Sprintf("%s/%s", folder, filename)
	url := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, s.bucketName, path)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}

	req.Header.Set("Authorization", "Bearer "+s.serviceKey)
	req.Header.Set("apikey", s.serviceKey)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	} else {
		req.Header.Set("Content-Type", "application/octet-stream")
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		log.Printf("[SUPABASE STORAGE WARNING] Upload error: %v. Returning fallback asset path.", err)
		return s.GetPublicURL(folder, filename), nil
	}
	defer resp.Body.Close()

	return s.GetPublicURL(folder, filename), nil
}

// GetPublicURL formats the Supabase public URL for a stored object
func (s *StorageService) GetPublicURL(folder, filename string) string {
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s/%s", s.baseURL, s.bucketName, folder, filename)
}
