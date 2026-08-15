const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

function request(method, urlPath, body, cookies) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: urlPath,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (cookies) {
      options.headers['Cookie'] = cookies;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, body: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let testsPassed = 0;
let testsFailed = 0;
let totalTests = 0;

function readCookies() {
  try {
    return fs.readFileSync(COOKIES_FILE, 'utf8');
  } catch (e) {
    return '';
  }
}

function assert(condition, testNumber, testName) {
  totalTests++;
  if (condition) {
    console.log(`✅ Test ${testNumber}: ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ Test ${testNumber}: ${testName}`);
  }
}

async function runTests() {
  console.log('==========================================');
  console.log('  Phase 2 Validation Tests');
  console.log('==========================================\n');

  // ==========================================
  console.log('--- Architecture & Middleware ---');
  // ==========================================

  // Test 1: Health check
  let res = await request('GET', '/health');
  assert(res.status === 200, 1, 'Health endpoint returns 200');
  assert(res.body.status === 'ok', 2, 'Health endpoint returns status=ok');

  // ==========================================
  console.log('\n--- User Registration ---');
  // ==========================================

  // Register first user
  res = await request('POST', '/register', {
    username: 'phasetestuser1',
    email: 'phasetest1@example.com',
    password: 'securepass123'
  });
  assert(res.status === 200, 3, 'Registration returns 200');
  assert(res.body.success === true, 4, 'Registration succeeds (user1)');

  // Register second user
  res = await request('POST', '/register', {
    username: 'phasetestuser2',
    email: 'phasetest2@example.com',
    password: 'securepass456'
  });
  assert(res.status === 200, 5, 'Second registration returns 200');
  assert(res.body.success === true, 6, 'Registration succeeds (user2)');

  // ==========================================
  console.log('\n--- User Login ---');
  // ==========================================

  // Login first user
  let loginRes1 = await request('POST', '/login', {
    email: 'phasetest1@example.com',
    password: 'securepass123'
  });
  assert(loginRes1.status === 200, 7, 'Login returns 200');
  assert(loginRes1.body.success === true, 8, 'Login succeeds (user1)');

  // Login second user
  let loginRes2 = await request('POST', '/login', {
    email: 'phasetest2@example.com',
    password: 'securepass456'
  });
  assert(loginRes2.status === 200, 9, 'Second login returns 200');
  assert(loginRes2.body.success === true, 10, 'Login succeeds (testuser2)');

  // ==========================================
  console.log('\n--- Authentication Middleware ---');
  // ==========================================

  // Unauthenticated request to feed should work (no auth required)
  res = await request('GET', '/api');
  assert(res.status === 200, 11, 'Unauthenticated API request returns 200');
  assert(res.body.posts !== undefined, 12, 'Feed returns posts array');

  // ==========================================
  console.log('\n--- Authenticated Endpoints ---');
  // ==========================================

  // Get current user (testuser)
  const testUserSession = loginRes1.body.sessionId;
  if (!testUserSession) throw new Error('No session ID for testuser');
  res = await request('GET', '/me', null, `connect.sid=${testUserSession}`);
  assert(res.status === 200, 12, 'Authenticated /me returns 200');
  assert(res.body.user !== undefined, 13, '/me returns user data');

  // Get current user (testuser2)
  const testUser2Session = loginRes2.body.sessionId;
  if (!testUser2Session) throw new Error('No session ID for testuser2');
  res = await request('GET', '/me', null, `connect.sid=${testUser2Session}`);
  assert(res.status === 200, 14, 'Second user /me returns 200');
  assert(res.body.user !== undefined, 15, 'Second user /me returns user data');

  // ==========================================
  console.log('\n--- Post Creation ---');
  // ==========================================

  // Create a post
  res = await request('POST', '/posts', { body: 'Hello from Phase 2 validation! This is a test post.' }, `session_id=${testUserSession}`);
  assert(res.status === 200, 16, 'Post creation returns 200');
  assert(res.body.success === true, 17, 'Post creation succeeds');
  const firstPostId = res.body.postId;

  // Create another post (for repost/quote testing)
  res = await request('POST', '/posts', { body: 'This post will be quoted and reposted!' }, `session_id=${testUserSession}`);
  assert(res.status === 200, 18, 'Second post creation succeeds');
  let secondPostId = res.body.postId;

  // ==========================================
  console.log('\n--- Post Validation ---');
  // ==========================================

  // Post over 280 characters should be rejected
  const longBody = 'A'.repeat(281);
  res = await request('POST', '/posts', { body: longBody }, `session_id=${testUserSession}`);
  assert(res.status === 200, 19, 'Over-length post returns 200');
  assert(res.body.error, 20, 'Over-length post is rejected');

  // Empty body should be rejected
  res = await request('POST', '/posts', { body: '' }, `session_id=${testUserSession}`);
  assert(res.status === 200, 21, 'Empty body returns 200');
  assert(res.body.error, 22, 'Empty body post is rejected');

  // No body should be rejected
  res = await request('POST', '/posts', {}, `session_id=${testUserSession}`);
  assert(res.status === 200, 23, 'No body returns 200');
  assert(res.body.error, 24, 'No body post is rejected');

  // ==========================================
  console.log('\n--- Feed & Posts ---');
  // ==========================================

  // Get feed posts
  res = await request('GET', '/api');
  assert(res.status === 200, 25, 'Feed API returns 200');
  assert(res.body.posts !== undefined, 26, 'Feed API returns posts array');
  console.log(`   Feed has ${res.body.posts ? res.body.posts.length : 0} posts`);

  // Search posts
  res = await request('GET', '/api?search=Hello');
  assert(res.status === 200, 27, 'Search API returns 200');
  assert(res.body.posts !== undefined, 28, 'Search API returns posts array');

  // Get user posts
  res = await request('GET', '/posts/user/testuser');
  assert(res.status === 200, 29, 'User posts returns 200');
  assert(res.body.posts !== undefined, 30, 'User posts returns posts array');

  // Get post by ID
  res = await request('GET', `/posts/${firstPostId}`);
  assert(res.status === 200, 31, 'Get post by ID returns 200');
  assert(res.body.post !== undefined, 32, 'Get post by ID returns post data');

  // ==========================================
  console.log('\n--- Repost & Quote ---');
  // ==========================================

  // Repost a post
  res = await request('POST', `/posts/${secondPostId}/repost`, null, `session_id=${testUserSession}`);
  assert(res.status === 200, 33, 'Repost returns 200');
  assert(res.body.success === true, 34, 'Repost succeeds');

  // Unrepost
  res = await request('DELETE', `/posts/${secondPostId}/repost`, null, `session_id=${testUserSession}`);
  assert(res.status === 200, 35, 'Unrepost returns 200');
  assert(res.body.success === true, 36, 'Unrepost succeeds');

  // Quote a post
  res = await request('POST', `/posts/${secondPostId}/quote`, { body: 'This is my quote!' }, `session_id=${testUserSession}`);
  assert(res.status === 200, 37, 'Quote returns 200');
  assert(res.body.success === true, 38, 'Quote succeeds');

  // ==========================================
  console.log('\n--- Follow & Unfollow ---');
  // ==========================================

  // Follow testuser from testuser2
  res = await request('POST', '/profiles/testuser/follow', null, `session_id=${testUser2Session}`);
  assert(res.status === 200, 39, 'Follow returns 200');
  assert(res.body.success === true, 40, 'Follow succeeds');

  // Cannot follow yourself
  res = await request('POST', '/profiles/testuser/follow', null, `session_id=${testUserSession}`);
  assert(res.status === 200, 41, 'Self-follow returns 200');
  assert(res.body.error, 42, 'Self-follow is blocked');

  // Get profile
  res = await request('GET', '/profiles/testuser');
  assert(res.status === 200, 43, 'Profile returns 200');
  assert(res.body.user !== undefined, 44, 'Profile returns user data');

  // Update profile
  res = await request('POST', '/profiles/testuser/profile', {
    display_name: 'Test User Updated',
    bio: 'Updated bio for validation'
  }, `session_id=${testUserSession}`);
  assert(res.status === 200, 45, 'Profile update returns 200');
  assert(res.body.success === true, 46, 'Profile update succeeds');

  // Unfollow testuser from testuser2
  res = await request('POST', '/profiles/testuser/unfollow', null, `session_id=${testUser2Session}`);
  assert(res.status === 200, 47, 'Unfollow returns 200');
  assert(res.body.success === true, 48, 'Unfollow succeeds');

  // ==========================================
  console.log('\n--- Add Conversation ---');
  // ==========================================

  // Add conversation
  res = await request('POST', '/profiles/testuser/add-conversation', null, `session_id=${testUserSession}`);
  assert(res.status === 200, 49, 'Add conversation returns 200');
  assert(res.body.success === true, 50, 'Add conversation succeeds');

  // Get conversations
  res = await request('GET', '/messages/conversations', `session_id=${testUserSession}`);
  assert(res.status === 200, 51, 'Get conversations returns 200');
  assert(res.body.conversations !== undefined, 52, 'Get conversations returns conversations array');

  // ==========================================
  console.log('\n--- Send & Get Messages ---');
  // ==========================================

  const convId = res.body.conversations[0].id;

  // Send a message
  res = await request('POST', '/messages/', { conversationId: convId, body: 'Hello from Phase 2! This is a test message.' }, `session_id=${testUserSession}`);
  assert(res.status === 200, 53, 'Send message returns 200');
  assert(res.body.success === true, 54, 'Send message succeeds');

  // Get conversation messages
  res = await request('GET', `/messages/conversation/${convId}`, `session_id=${testUserSession}`);
  assert(res.status === 200, 55, 'Get conversation returns 200');
  assert(res.body.messages !== undefined, 56, 'Get conversation returns messages array');

  // Get conversations with unread count
  res = await request('GET', '/messages/conversations', `session_id=${testUserSession}`);
  assert(res.status === 200, 57, 'Conversations with unread returns 200');
  assert(res.body.conversations !== undefined, 58, 'Conversations with unread returns conversations array');

  // Delete message
  const lastMsgId = res.body.messages[res.body.messages.length - 1].id;
  res = await request('DELETE', `/messages/${lastMsgId}`, null, `session_id=${testUserSession}`);
  assert(res.status === 200, 59, 'Delete message returns 200');
  assert(res.body.success === true, 60, 'Delete message succeeds');

  // ==========================================
  console.log('\n--- Delete Post ---');
  // ==========================================

  // Delete the first post
  res = await request('DELETE', `/posts/${firstPostId}`, null, `session_id=${testUserSession}`);
  assert(res.status === 200, 61, 'Delete own post returns 200');
  assert(res.body.success === true, 62, 'Delete own post succeeds');

  // Verify post is deleted
  res = await request('GET', `/posts/${firstPostId}`);
  assert(res.status === 404 || res.body.error, 63, 'Deleted post returns 404 or error');

  // ==========================================
  console.log('\n--- Analytics ---');
  // ==========================================

  // Analytics API
  res = await request('GET', '/analytics/api', null, `session_id=${testUserSession}`);
  assert(res.status === 200, 64, 'Analytics API returns 200');
  assert(res.body.stats !== undefined, 65, 'Analytics API returns stats');

  // Analytics view (should redirect to login since we have a session)
  res = await request('GET', '/analytics');
  assert(res.status === 302 || res.status === 200, 66, 'Analytics view responds (200 or redirect)');

  // ==========================================
  console.log('\n--- Views ---');
  // ==========================================

  // Feed view
  res = await request('GET', '/feed');
  assert(res.status === 200, 67, 'Feed view returns 200');

  // Users index
  res = await request('GET', '/users');
  assert(res.status === 200, 68, 'Users index returns 200');

  // Login page
  res = await request('GET', '/login');
  assert(res.status === 200, 69, 'Login page returns 200');

  // Register page
  res = await request('GET', '/register');
  assert(res.status === 200, 70, 'Register page returns 200');

  // ==========================================
  console.log('\n--- Logout ---');
  // ==========================================

  res = await request('POST', '/logout', null, `session_id=${testUserSession}`);
  assert(res.status === 200, 71, 'Logout returns 200');
  assert(res.body.success === true, 72, 'Logout succeeds');

  // After logout, should be unauthenticated
  res = await request('GET', '/api');
  assert(res.status === 302 || res.body.error, 73, 'Post-logout API request is blocked');

  // ==========================================
  console.log('\n--- Second User Operations ---');
  // ==========================================

  // Second user creates a post
  res = await request('POST', '/posts', { body: 'Post from second user!' }, `session_id=${testUser2Session}`);
  assert(res.status === 200, 74, 'Second user post creation returns 200');
  assert(res.body.success === true, 75, 'Second user post creation succeeds');

  // Second user gets their posts
  res = await request('GET', '/posts/user/testuser2');
  assert(res.status === 200, 76, 'Second user posts returns 200');
  assert(res.body.posts !== undefined, 77, 'Second user posts returns posts array');

  // Second user deletes their post
  let secondUserPostId = res.body.posts[0].id;
  res = await request('DELETE', `/posts/${secondUserPostId}`, null, `session_id=${testUser2Session}`);
  assert(res.status === 200, 78, 'Second user delete returns 200');
  assert(res.body.success === true, 79, 'Second user delete succeeds');

  // ==========================================
  console.log('\n==========================================');
  console.log(`  Results: ${testsPassed}/${totalTests} passed, ${testsFailed} failed`);
  console.log('==========================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
