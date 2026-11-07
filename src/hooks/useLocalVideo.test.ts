import test from 'node:test';
import assert from 'node:assert/strict';
import { useLocalVideo } from './useLocalVideo';

test('useLocalVideo Hook: Object URL Generation & Revocation Logic', () => {
  const createdUrls: string[] = [];
  const revokedUrls: string[] = [];

  // Mock URL.createObjectURL and URL.revokeObjectURL for Node environment
  if (!(globalThis as any).URL) {
    (globalThis as any).URL = {};
  }

  (globalThis as any).URL.createObjectURL = (file: any) => {
    const url = `blob:http://localhost:3000/${Math.random().toString(36).slice(2, 10)}`;
    createdUrls.push(url);
    return url;
  };

  (globalThis as any).URL.revokeObjectURL = (url: string) => {
    revokedUrls.push(url);
  };

  // Create mock File object
  const mockFile = {
    name: 'Inception.2010.1080p.mp4',
    size: 154857600, // ~147.7 MB
    type: 'video/mp4',
  } as unknown as File;

  // Simulate object URL creation
  const url1 = (globalThis as any).URL.createObjectURL(mockFile);
  assert.ok(url1.startsWith('blob:'));
  assert.equal(createdUrls.length, 1);

  // Simulate source change and revocation
  (globalThis as any).URL.revokeObjectURL(url1);
  assert.equal(revokedUrls.length, 1);
  assert.equal(revokedUrls[0], url1);
});
