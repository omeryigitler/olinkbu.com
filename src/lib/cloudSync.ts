import type { User } from 'firebase/auth';
import type { Firestore, Unsubscribe } from 'firebase/firestore';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

export type ReactionType = 'lightbulb' | 'deep' | 'fire' | 'inspire';

export type CloudSyncSnippetMeta = {
  id: string;
  userId?: string;
  category?: string;
  platform?: string;
};

export function ensureUserProfile(db: Firestore, user: User) {
  return setDoc(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      displayName: user.displayName || 'Olinkbu Curator',
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeSavedSnippetIds(
  db: Firestore,
  userId: string,
  onChange: (snippetIds: string[]) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', userId, 'saves'),
    (snapshot) => {
      onChange(snapshot.docs.map((saveDoc) => saveDoc.id));
    },
    (error) => {
      console.error('Saved snippets subscription failed:', error);
      onError?.(error);
    },
  );
}

export async function saveSnippet(
  db: Firestore,
  user: User,
  snippet: CloudSyncSnippetMeta,
) {
  const saveRef = doc(db, 'users', user.uid, 'saves', snippet.id);

  await setDoc(saveRef, {
    userId: user.uid,
    snippetId: snippet.id,
    ownerId: snippet.userId || '',
    category: snippet.category || '',
    platform: snippet.platform || '',
    createdAt: serverTimestamp(),
  });

  await recordTasteEvent(db, user.uid, {
    type: 'save',
    snippetId: snippet.id,
    category: snippet.category || '',
    platform: snippet.platform || '',
  });
}

export async function unsaveSnippet(db: Firestore, userId: string, snippetId: string) {
  await deleteDoc(doc(db, 'users', userId, 'saves', snippetId));
}

export async function toggleSnippetSave(
  db: Firestore,
  user: User,
  snippet: CloudSyncSnippetMeta,
  isSaved: boolean,
) {
  if (isSaved) {
    await unsaveSnippet(db, user.uid, snippet.id);
    return false;
  }

  await saveSnippet(db, user, snippet);
  return true;
}

export async function setSnippetReaction(
  db: Firestore,
  user: User,
  snippet: CloudSyncSnippetMeta,
  reactionType: ReactionType,
) {
  const reactionRef = doc(db, 'snippets', snippet.id, 'reactions', user.uid);

  await setDoc(
    reactionRef,
    {
      userId: user.uid,
      reactionType,
      category: snippet.category || '',
      platform: snippet.platform || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  await recordTasteEvent(db, user.uid, {
    type: 'reaction',
    snippetId: snippet.id,
    reactionType,
    category: snippet.category || '',
    platform: snippet.platform || '',
  });
}

export function recordTasteEvent(
  db: Firestore,
  userId: string,
  payload: Record<string, unknown>,
) {
  return addDoc(collection(db, 'users', userId, 'tasteEvents'), {
    ...payload,
    userId,
    createdAt: serverTimestamp(),
  });
}
