import { useEffect, useReducer } from "react";
import { io } from "socket.io-client";

let socket;
let queue = [];

const initialState = {
  userPosts: [],
  feedPosts: [],
  loading: false,
  error: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_POSTS":
      return {
        ...state,
        userPosts: action.payload.userPosts,
        feedPosts: action.payload.feedPosts,
      };
    case "ADD_POST":
      return {
        ...state,
        feedPosts: [action.payload, ...state.feedPosts],
        userPosts:
          action.payload.auteur === action.userId
            ? [action.payload, ...state.userPosts]
            : state.userPosts,
      };
    case "DELETE_POST":
      return {
        ...state,
        feedPosts: state.feedPosts.filter(p => p._id !== action.payload),
        userPosts: state.userPosts.filter(p => p._id !== action.payload),
      };
    case "UPDATE_POST":
      return {
        ...state,
        feedPosts: state.feedPosts.map(p =>
          p._id === action.payload._id ? action.payload : p
        ),
        userPosts: state.userPosts.map(p =>
          p._id === action.payload._id ? action.payload : p
        ),
      };
    default:
      return state;
  }
}

export default function usePosts(userId, token) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!userId || !token) return;

    if (!socket) {
      socket = io("http://localhost:5000", {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      });
    }

    const fetchPosts = async () => {
      dispatch({ type: "SET_LOADING", payload: true });
      try {
        const [resUser, resFeed] = await Promise.all([
          fetch(`/api/posts/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/posts/feed`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (!resUser.ok || !resFeed.ok) throw new Error("Erreur chargement posts");

        const [userPosts, feedPosts] = await Promise.all([resUser.json(), resFeed.json()]);

        dispatch({ type: "SET_POSTS", payload: { userPosts, feedPosts } });
      } catch {
        dispatch({ type: "SET_ERROR", payload: "Impossible de charger les posts." });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    fetchPosts();

    const handleNewPost = post => {
      if (!socket.connected) {
        queue.push({ type: "ADD_POST", payload: post });
      } else {
        dispatch({ type: "ADD_POST", payload: post, userId });
      }
    };

    const handleDeletePost = postId => {
      if (!socket.connected) {
        queue.push({ type: "DELETE_POST", payload: postId });
      } else {
        dispatch({ type: "DELETE_POST", payload: postId });
      }
    };

    const handleUpdatePost = post => {
      if (!socket.connected) {
        queue.push({ type: "UPDATE_POST", payload: post });
      } else {
        dispatch({ type: "UPDATE_POST", payload: post });
      }
    };

    socket.on("connect", () => {
      socket.emit("join", { userId });
      queue.forEach(event => dispatch(event));
      queue = [];
    });

    socket.on("newPost", handleNewPost);
    socket.on("deletePost", handleDeletePost);
    socket.on("updatePost", handleUpdatePost);

    return () => {
      socket.off("newPost", handleNewPost);
      socket.off("deletePost", handleDeletePost);
      socket.off("updatePost", handleUpdatePost);
      socket.off("connect");
    };
  }, [userId, token]);

  return {
    ...state,
    setPosts: posts => dispatch({ type: "SET_POSTS", payload: posts }),
  };
}
