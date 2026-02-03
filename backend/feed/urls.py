from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PostViewSet, CommentViewSet, LeaderboardView, ListCreateCommentView, MeView, GuestLoginView

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')

urlpatterns = [
    path('', include(router.urls)),
    path('posts/<int:post_id>/comments/', ListCreateCommentView.as_view(), name='post-comments'),
    path('comments/<int:pk>/like/', CommentViewSet.as_view({'post': 'like'}), name='comment-like'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('me/', MeView.as_view(), name='me'),
    path('guest-login/', GuestLoginView.as_view(), name='guest-login'),
]
