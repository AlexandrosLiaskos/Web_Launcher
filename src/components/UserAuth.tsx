import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, AuthError, User } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { useWebsiteStore } from '../store/websiteStore';
import { FC } from 'react';
import React from 'react';

export const UserAuth: FC = () => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setCurrentUser } = useWebsiteStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setCurrentUser(user?.uid || null);
      setError(null);
    });
    return () => unsubscribe();
  }, [setCurrentUser]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      setCurrentUser(result.user.uid);
    } catch (error) {
      const authError = error as AuthError;
      console.error('Sign in error:', authError);
      setError(authError.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      const authError = error as AuthError;
      console.error('Sign out error:', authError);
      setError(authError.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-blue-500 rounded-full animate-spin"></div>
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
      
      {user ? (
        <div className="flex items-center space-x-2">
          {user.photoURL && (
            <img 
              src={user.photoURL} 
              alt={user.displayName || 'User'} 
              className="w-8 h-8 rounded-full"
            />
          )}
          <span>{user.displayName || 'User'}</span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            disabled={loading}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={handleGoogleSignIn}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center space-x-2"
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
      )}
    </div>
  );
};
