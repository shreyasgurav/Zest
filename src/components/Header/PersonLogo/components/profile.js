import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import "./profile.css";

function Profile() {
  const [userDetails, setUserDetails] = useState(null);
  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      console.log(user);

      const docRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
        console.log(docSnap.data());
      } else {
        console.log("User is not logged in");
      }
    });
  };
  useEffect(() => {
    fetchUserData();
  }, []);

  return (
  <div>
      {userDetails ? (
     
    <div className="page-container">
      <div className="user-profile-container">
          <div className="profile-header">
            <div className="profile-avatar">
            <img className="avatar-image"
              src={userDetails.photo}
              style={{ borderRadius: "50%" }}
            />
            </div>
              <h2>{userDetails.firstName}</h2>
          </div>

          <div className="registered-events">
                    <h3>Attended Events</h3>
                    <div className="events-list">
                        {[
                            { id: 1, title: "Example Workshop", date: "2025-02-06" },
                            { id: 2, title: "Steve Jobs Speaker Session", date: "2024-03-25" }
                        ].map(event => (
                            <div key={event.id} className="event-item">
                                <h4>{event.title}</h4>
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
      </div>
    </div>
      ) : (
        <p>Loading...</p>
      )}
  </div>
  
  );
}
export default Profile;
