from django.contrib import admin
from django.db.models import Count
from .models import Post, Comment, Like

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('author', 'short_content', 'created_at', 'likes_count')
    list_filter = ('created_at',)
    search_fields = ('content', 'author__username')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(_likes_count=Count('likes'))
        return queryset

    def likes_count(self, obj):
        return obj._likes_count
    likes_count.admin_order_field = '_likes_count'

    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'short_content', 'post', 'created_at', 'likes_count')
    list_filter = ('created_at',)
    search_fields = ('content', 'author__username')

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(_likes_count=Count('likes'))
        return queryset

    def likes_count(self, obj):
        return obj._likes_count
    likes_count.admin_order_field = '_likes_count'

    def short_content(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('user', 'target', 'created_at')
    list_filter = ('created_at',)

    def target(self, obj):
        if obj.post:
            return f"Post: {obj.post}"
        elif obj.comment:
            return f"Comment: {obj.comment}"
        return "Unknown"
