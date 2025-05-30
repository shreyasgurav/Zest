import React from 'react';
import './Blogs.css';

const BlogsPage = () => {
    return (
      <div className="blogs-container">
        <div className="blogs-content">
          <h1 className="blogs-title">Blogs</h1>
          
          <div className="no-blogs-card">
            <div className="no-blogs-heading">
              No Blogs Available
            </div>
            <p className="no-blogs-text">
              Check back later for new and exciting content!
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  export default BlogsPage;
