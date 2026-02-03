# EXPLAINER

## The Tree
**Modeling**: The nested comments are modeled using a standard Adjacency List pattern where each comment has a `parent` ForeignKey pointing to strictly one other comment (or null for root comments).

**Serialization**: To avoid the N+1 problem (scanning the database recursively for every comment layer), we use a "Fetch All, Assemble Later" strategy:
1. Fetch the Post.
2. Fetch *all* comments associated with that Post in exactly one SQL query (`Comment.objects.filter(post=post)`).
3. In the Application Layer (Python), we iterate through this flat list to reconstruct the tree structure (mapping IDs to objects and assigning children to parents).
4. The Serializer then receives a fully hydrated tree of objects in memory, requiring no further DB hits.

This ensures that loading a post with 50 or 5000 comments always requires exactly 2 main queries (1 for Post, 1 for Comments), regardless of depth.

## The Math
To calculate the "Last 24h Leaderboard" dynamically without storing counters, we use Django's aggregation capabilities on the `Like` table.

The effective query logic is:
```python
threshold = timezone.now() - timedelta(hours=24)
User.objects.annotate(
    post_likes=Count('posts__likes', filter=Q(posts__likes__created_at__gte=threshold), distinct=True),
    comment_likes=Count('comments__likes', filter=Q(comments__likes__created_at__gte=threshold), distinct=True)
).annotate(
    karma=F('post_likes') * 5 + F('comment_likes') * 1
).order_by('-karma')[:5]
```
This aggregates the counts of likes received on the user's posts (weighted 5x) and comments (weighted 1x) strictly within the time window.

## The AI Audit
**Issue**: AI tools often suggest using `serializers.SerializerMethodField` with a recursive call to `CommentSerializer(obj.parent)` or a third-party `RecursiveField`. 
**Why it's buggy/inefficient**: This naively triggers a new database query for every single comment to fetch its children (`obj.replies.all()`), resulting in the N+1 problem. For 50 comments, this would hit the DB 50+ times.
**Fix**: I implemented the `prefetched_replies` logic in the View. The View prefetches the flat list, populates a temporary `_prefetched_replies` list on each comment object in memory, and the Serializer simply reads this list. This reduces n queries to 1.
