import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { Request } from 'firebase-functions/v2/https';
import { Response } from 'express';

// from https://github.com/firebase/functions-samples/blob/b5aa45d9400ed43f5b9031ed74935cdd781e614b/Node-1st-gen/authorized-https-endpoint/functions/index.js
export const validateFirebaseIdToken = async (
  req: Request,
  res: Response,
) => {
  logger.log('Check if request is authorized with Firebase ID token');

  if (
    (!req.headers.authorization ||
      !req.headers.authorization.startsWith('Bearer ')) &&
    !(req.cookies && req.cookies.__session)
  ) {
    logger.error(
      'No Firebase ID token was passed as a Bearer token in the Authorization header.',
      'Make sure you authorize your request by providing the following HTTP header:',
      'Authorization: Bearer <Firebase ID Token>',
      'or by passing a "__session" cookie.',
    );
    res.status(403).send();
    return null;
  }

  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    logger.log('Found "Authorization" header');
    // Read the ID Token from the Authorization header.
    idToken = req.headers.authorization.split('Bearer ')[1];
  } else if (req.cookies) {
    logger.log('Found "__session" cookie');
    // Read the ID Token from cookie.
    idToken = req.cookies.__session;
  } else {
    // No cookie
    res.status(403).send();
    return null;
  }

  try {
    const decodedIdToken = await admin.auth().verifyIdToken(idToken);
    logger.log('ID Token correctly decoded', decodedIdToken);
    return decodedIdToken;
  } catch (error) {
    logger.error('Error while verifying Firebase ID token:', error);
    res.status(403).send();
    return null;
  }
};
