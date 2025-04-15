'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { User } from '@/types';
import { db } from '@/lib/firebase/config';
import {
  collection,
  query as firebaseQuery,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUser: (user: User) => void;
  currentUserId: string;
}

export function UserSearchDialog({
  open,
  onOpenChange,
  onSelectUser,
  currentUserId,
}: UserSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Create queries to search for users by displayName and email
      const lowercaseQuery = query.toLowerCase();
      const usersRef = collection(db, 'users');

      const displayNameQuery = firebaseQuery(
        usersRef,
        where('displayName', '>=', lowercaseQuery),
        where('displayName', '<=', lowercaseQuery + '\uf8ff'),
        limit(10)
      );

      const emailQuery = firebaseQuery(
        usersRef,
        where('email', '>=', lowercaseQuery),
        where('email', '<=', lowercaseQuery + '\uf8ff'),
        limit(10)
      );

      // Get both queries and combine results
      const [displayNameSnapshot, emailSnapshot] = await Promise.all([
        getDocs(displayNameQuery),
        getDocs(emailQuery),
      ]);

      // Combine results and remove duplicates
      const userMap = new Map();
      [...displayNameSnapshot.docs, ...emailSnapshot.docs].forEach((doc) => {
        if (!userMap.has(doc.id)) {
          userMap.set(doc.id, doc);
        }
      });

      const users = Array.from(userMap.values())
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            displayName: data.displayName,
            photoURL: data.photoURL,
            status: data.status,
            createdAt: data.createdAt.toString(),
            updatedAt: data.updatedAt.toString(),
          } as User;
        })
        // Filter out the current user
        .filter((user) => user.id !== currentUserId);

      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search to avoid too many Firestore queries
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getInitials = (name: string = 'User') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Find or start a conversation</DialogTitle>
        </DialogHeader>

        <div className='relative mt-2'>
          <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search by name, email, or username'
            className='pl-8'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className='mt-2 max-h-72 overflow-y-auto'>
          {loading ? (
            <div className='flex justify-center py-4'>
              <div className='h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent' />
            </div>
          ) : searchResults.length > 0 ? (
            <div className='space-y-1'>
              {searchResults.map((user) => (
                <Button
                  key={user.id}
                  variant='ghost'
                  className='w-full justify-start px-2 py-6'
                  onClick={() => onSelectUser(user)}
                >
                  <Avatar className='h-8 w-8 mr-2'>
                    <AvatarImage
                      src={user.photoURL || ''}
                      alt={user.displayName}
                    />
                    <AvatarFallback>
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>{user.displayName}</span>
                    <span className='text-xs text-muted-foreground'>
                      {user.email}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          ) : searchQuery.length > 0 ? (
            <div className='py-4 text-center text-sm text-muted-foreground'>
              No users found. Try a different search term.
            </div>
          ) : (
            <div className='py-4 text-center text-sm text-muted-foreground'>
              Start typing to search for users
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
