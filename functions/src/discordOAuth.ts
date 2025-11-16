import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { defineJsonSecret, defineString } from 'firebase-functions/params';
import cors from 'cors';

const discordOauthClientCreds = defineJsonSecret('DISCORD_OAUTH_CLIENT_CREDS');
const discordRedirectUri = defineString('DISCORD_REDIRECT_URI', {
  default:
    'https://us-central1-w1aw-schedule-76a82.cloudfunctions.net/discordOAuthCallback',
});

const corsHandler = cors({ origin: true });

/**
 * Initiates the Discord OAuth flow by returning the authorization URL
 * This function is called from the frontend to start the OAuth process
 */
export const discordOAuthInitiate = functions.https.onRequest(
  { secrets: [discordOauthClientCreds] },
  (request, response) => {
    corsHandler(request, response, async () => {
      try {
        // Get Discord client ID from environment config
        const { clientId } = discordOauthClientCreds.value();
        if (!clientId) {
          response.status(500).json({
            error: 'Discord client credentials not configured',
          });
          return;
        }

        // Verify user is authenticated
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          response.status(401).json({ error: 'Unauthorized' });
          return;
        }

        const token = authHeader.split('Bearer ')[1];
        try {
          await admin.auth().verifyIdToken(token);
        } catch {
          response.status(401).json({ error: 'Invalid token' });
          return;
        }

        // Generate a random state parameter for CSRF protection
        const state = Math.random().toString(36).substring(2, 15);

        // Store the state in Firestore with the user's ID token
        const stateDoc = admin
          .firestore()
          .collection('oauth_states')
          .doc(state);
        await stateDoc.set({
          token: token,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });

        // Construct Discord OAuth URL
        const redirectUri = discordRedirectUri.value();
        const scopes = 'identify';

        const authUrl =
          `https://discord.com/api/oauth2/authorize?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `state=${state}`;

        response.json({ authUrl });
      } catch (error) {
        console.error('Error initiating Discord OAuth:', error);
        response.status(500).json({ error: 'Internal server error' });
      }
    });
  },
);

/**
 * Handles the OAuth callback from Discord
 * Exchanges the authorization code for an access token and stores user info
 */
export const discordOAuthCallback = functions.https.onRequest(
  { secrets: [discordOauthClientCreds] },
  (request, response) => {
    corsHandler(request, response, async () => {
      try {
        const { code, state, error } = request.query;

        // Check for OAuth errors
        if (error) {
          response.redirect(
            `/?discord_error=${encodeURIComponent(error as string)}`,
          );
          return;
        }

        if (!code || !state) {
          response.status(400).send('Missing code or state parameter');
          return;
        }

        // Verify state parameter
        const stateDoc = admin
          .firestore()
          .collection('oauth_states')
          .doc(state as string);
        const stateData = await stateDoc.get();

        if (!stateData.exists) {
          response.status(400).send('Invalid state parameter');
          return;
        }

        const { token, expiresAt } = stateData.data() as {
          token: string;
          expiresAt: admin.firestore.Timestamp;
        };

        // Check if state has expired
        if (expiresAt.toDate() < new Date()) {
          await stateDoc.delete();
          response.status(400).send('State parameter expired');
          return;
        }

        // Verify the user token
        let decodedToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(token);
        } catch {
          await stateDoc.delete();
          response.status(401).send('Invalid authentication token');
          return;
        }

        // Exchange authorization code for access token
        const { clientId, clientSecret } = discordOauthClientCreds.value();
        const redirectUri = discordRedirectUri.value();

        if (!clientId || !clientSecret) {
          response.status(500).send('Discord OAuth not configured');
          return;
        }

        const tokenResponse = await fetch(
          'https://discord.com/api/oauth2/token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              grant_type: 'authorization_code',
              code: code as string,
              redirect_uri: redirectUri,
            }),
          },
        );

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Discord token exchange failed:', errorText);
          response.status(500).send('Failed to exchange authorization code');
          return;
        }

        const tokenData = await tokenResponse.json();

        // Get user info from Discord
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userResponse.ok) {
          response.status(500).send('Failed to get Discord user info');
          return;
        }

        const discordUser = await userResponse.json();

        // Update user document in Firestore
        const userDoc = admin
          .firestore()
          .collection('users')
          .doc(decodedToken.uid);
        await userDoc.update({
          discordId: discordUser.id,
          discordUsername: `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`,
          discordDiscriminator: discordUser.discriminator,
          discordAvatar: discordUser.avatar,
        });

        // Clean up state document
        await stateDoc.delete();

        // Redirect back to user settings page with success message
        response.redirect('/?discord_connected=true');
      } catch (error) {
        console.error('Error in Discord OAuth callback:', error);
        response.status(500).send('Internal server error');
      }
    });
  },
);
