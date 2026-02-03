from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Post, Comment

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'is_staff']

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Comment
        fields = ['id', 'author', 'content', 'created_at', 'parent', 'likes_count', 'is_liked', 'replies']

    def get_replies(self, obj):
        if hasattr(obj, '_prefetched_replies'):
             return CommentSerializer(obj._prefetched_replies, many=True, context=self.context).data
        return []

class PostSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    likes_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.BooleanField(read_only=True, default=False)

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'created_at', 'likes_count', 'is_liked']

class PostDetailSerializer(PostSerializer):
    comments = serializers.SerializerMethodField()

    class Meta(PostSerializer.Meta):
        fields = PostSerializer.Meta.fields + ['comments']

    def get_comments(self, obj):
        if hasattr(obj, 'comments_tree'):
            return CommentSerializer(obj.comments_tree, many=True, context=self.context).data
        return []

class CreatePostSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ['content']

class CreateCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['content', 'parent']
