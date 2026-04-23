
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Blog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the BlogHome page
    navigate("/blog");
  }, [navigate]);

  return <div>Redirection vers le blog...</div>;
};

export default Blog;
