package handlers

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/sports/livescores/internal/database"
	"github.com/sports/livescores/internal/models"
)

type BlogHandler struct {
	store *database.Store
}

func NewBlogHandler(store *database.Store) *BlogHandler {
	return &BlogHandler{store: store}
}

func (h *BlogHandler) GetPosts(w http.ResponseWriter, r *http.Request) {
	category := r.URL.Query().Get("category")
	tag := r.URL.Query().Get("tag")

	posts := h.store.GetAllBlogPosts(category, tag)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"posts": posts,
		"count": len(posts),
	})
}

func (h *BlogHandler) GetPostBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	post, ok := h.store.GetBlogPostBySlug(slug)
	if !ok {
		http.Error(w, `{"error": "Post not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(post)
}

func generateSlug(title string) string {
	slug := strings.ToLower(title)
	reg := regexp.MustCompile(`[^a-z0-9]+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = "article-" + uuid.New().String()[:8]
	}
	return slug
}

func (h *BlogHandler) CreatePost(w http.ResponseWriter, r *http.Request) {
	var post models.BlogPost
	if err := json.NewDecoder(r.Body).Decode(&post); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(post.Title) == "" {
		http.Error(w, `{"error": "Title cannot be empty"}`, http.StatusBadRequest)
		return
	}

	post.ID = "post-" + uuid.New().String()[:8]
	if post.Slug == "" {
		post.Slug = generateSlug(post.Title)
	}
	if post.AuthorName == "" {
		post.AuthorName = "SportsHub Editorial"
	}
	if post.AuthorAvatar == "" {
		post.AuthorAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
	}
	if post.CoverImage == "" {
		post.CoverImage = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&auto=format&fit=crop&q=80"
	}
	if post.Category == "" {
		post.Category = "Tactical Analysis"
	}
	if post.ReadTimeMin <= 0 {
		words := len(strings.Fields(post.ContentHTML))
		post.ReadTimeMin = (words / 200) + 1
	}
	if post.Status == "" {
		post.Status = "published"
	}

	now := time.Now()
	post.CreatedAt = now
	post.UpdatedAt = now
	post.PublishedAt = now

	h.store.SaveBlogPost(&post)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(post)
}

func (h *BlogHandler) UpdatePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var updated models.BlogPost
	if err := json.NewDecoder(r.Body).Decode(&updated); err != nil {
		http.Error(w, `{"error": "Invalid request body"}`, http.StatusBadRequest)
		return
	}

	existing, ok := h.store.GetBlogPostBySlug(id)
	if !ok {
		http.Error(w, `{"error": "Post not found"}`, http.StatusNotFound)
		return
	}

	if updated.Title != "" {
		existing.Title = updated.Title
	}
	if updated.Excerpt != "" {
		existing.Excerpt = updated.Excerpt
	}
	if updated.ContentHTML != "" {
		existing.ContentHTML = updated.ContentHTML
	}
	if updated.CoverImage != "" {
		existing.CoverImage = updated.CoverImage
	}
	if updated.Category != "" {
		existing.Category = updated.Category
	}
	if len(updated.Tags) > 0 {
		existing.Tags = updated.Tags
	}
	if updated.MatchID != "" {
		existing.MatchID = updated.MatchID
	}
	existing.UpdatedAt = time.Now()

	h.store.SaveBlogPost(existing)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(existing)
}

func (h *BlogHandler) LikePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	likes, ok := h.store.LikeBlogPost(id)
	if !ok {
		http.Error(w, `{"error": "Post not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"likes": likes,
	})
}

func (h *BlogHandler) DeletePost(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if !h.store.DeleteBlogPost(id) {
		http.Error(w, `{"error": "Post not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "deleted",
	})
}
