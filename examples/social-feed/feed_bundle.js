// app/components/Feed.tsx
import { useState, useEffect, useRef } from "react";
import { jsxDEV } from "react/jsx-dev-runtime";
"use client";
function Feed({ initialPosts }) {
  const [posts, setPosts] = useState(initialPosts);
  const [likedPosts, setLikedPosts] = useState(new Set);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef(null);
  const loadMore = () => {
    if (loading || !hasMore)
      return;
    setLoading(true);
    setTimeout(() => {
      const newPosts = generateMorePosts(posts.length, 5);
      setPosts((prev) => [...prev, ...newPosts]);
      setLoading(false);
      if (posts.length >= 45) {
        setHasMore(false);
      }
    }, 800);
  };
  useEffect(() => {
    if (!loadMoreRef.current)
      return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore();
      }
    }, { threshold: 0.1 });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  });
  const toggleLike = (postId, e) => {
    e.preventDefault();
    e.stopPropagation();
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
    setPosts((prev) => prev.map((p) => {
      if (p.id === postId) {
        const isLiked = likedPosts.has(postId);
        return { ...p, likes: p.likes + (isLiked ? -1 : 1) };
      }
      return p;
    }));
  };
  const navigateToPost = (postId) => {
    if (typeof window !== "undefined" && window.melinaNavigate) {
      window.melinaNavigate(`/post/${postId}`);
    }
  };
  return /* @__PURE__ */ jsxDEV("div", {
    children: [
      posts.map((post) => /* @__PURE__ */ jsxDEV("article", {
        className: "post-card",
        style: {
          marginBottom: "16px",
          viewTransitionName: `post-${post.id}`
        },
        onClick: () => navigateToPost(post.id),
        children: [
          /* @__PURE__ */ jsxDEV("header", {
            className: "post-header",
            children: [
              /* @__PURE__ */ jsxDEV("div", {
                className: "post-avatar",
                children: post.author.name.split(" ").map((n) => n[0]).join("")
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsxDEV("div", {
                className: "post-meta",
                children: [
                  /* @__PURE__ */ jsxDEV("div", {
                    className: "post-author",
                    children: post.author.name
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsxDEV("div", {
                    className: "post-time",
                    children: [
                      post.author.handle,
                      " · ",
                      post.timeAgo
                    ]
                  }, undefined, true, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsxDEV("p", {
            className: "post-content",
            children: post.content
          }, undefined, false, undefined, this),
          post.hasImage && post.imageUrl && /* @__PURE__ */ jsxDEV("img", {
            src: post.imageUrl,
            alt: "Post image",
            className: "post-image",
            loading: "lazy"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsxDEV("div", {
            className: "post-actions",
            children: [
              /* @__PURE__ */ jsxDEV("button", {
                className: `post-action ${likedPosts.has(post.id) ? "liked" : ""}`,
                onClick: (e) => toggleLike(post.id, e),
                children: [
                  /* @__PURE__ */ jsxDEV("svg", {
                    width: "18",
                    height: "18",
                    viewBox: "0 0 24 24",
                    fill: likedPosts.has(post.id) ? "currentColor" : "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: /* @__PURE__ */ jsxDEV("path", {
                      d: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  post.likes + (likedPosts.has(post.id) ? 1 : 0)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                className: "post-action",
                children: [
                  /* @__PURE__ */ jsxDEV("svg", {
                    width: "18",
                    height: "18",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: /* @__PURE__ */ jsxDEV("path", {
                      d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  post.comments
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsxDEV("button", {
                className: "post-action",
                children: [
                  /* @__PURE__ */ jsxDEV("svg", {
                    width: "18",
                    height: "18",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "2",
                    children: /* @__PURE__ */ jsxDEV("path", {
                      d: "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
                    }, undefined, false, undefined, this)
                  }, undefined, false, undefined, this),
                  post.shares
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, post.id, true, undefined, this)),
      /* @__PURE__ */ jsxDEV("div", {
        ref: loadMoreRef,
        className: "loading-indicator",
        children: [
          loading && /* @__PURE__ */ jsxDEV("div", {
            className: "loading-spinner"
          }, undefined, false, undefined, this),
          !hasMore && /* @__PURE__ */ jsxDEV("p", {
            style: { color: "var(--text-muted)", fontSize: "0.9rem" },
            children: "You've reached the end! \uD83C\uDF89"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
function generateMorePosts(offset, count) {
  const authors = [
    { name: "Sarah Chen", handle: "@sarahc" },
    { name: "Alex Rivera", handle: "@alexr" },
    { name: "Jordan Kim", handle: "@jordank" },
    { name: "Taylor Wong", handle: "@taylorw" },
    { name: "Morgan Lee", handle: "@morganl" }
  ];
  const contents = [
    "Another day, another deploy. Love how fast iteration cycles are with islands.",
    "Just realized I haven't thought about hydration mismatches in weeks. This is the way.",
    "The mental model of 'HTML first, JS second' is so refreshing.",
    "Debugging is so much easier when most of your app is just HTML.",
    "Server components + islands = best of both worlds"
  ];
  return Array.from({ length: count }, (_, i) => {
    const id = offset + i + 1;
    return {
      id,
      author: authors[id % authors.length],
      content: `${contents[id % contents.length]} #post${id}`,
      timeAgo: `${Math.floor(id / 2)}h ago`,
      hasImage: id % 4 === 0,
      imageUrl: id % 4 === 0 ? `https://picsum.photos/seed/${id}/800/450` : null,
      likes: Math.floor(Math.random() * 200) + 10,
      comments: Math.floor(Math.random() * 30) + 1,
      shares: Math.floor(Math.random() * 15)
    };
  });
}
export {
  Feed as default
};

//# debugId=8DD1D49F8EBE370C64756E2164756E21
//# sourceMappingURL=Feed-vdkp1114.js.map
