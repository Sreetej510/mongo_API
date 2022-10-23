const OktaJwtVerifier = require('@okta/jwt-verifier');
const oktaJwtVerifier = new OktaJwtVerifier({
  issuer: 'https://okta.omega510.com/oauth2/default'
});
const audience = 'api://default';

const authenticationRequired = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/Bearer (.+)/);
  if (!match) {
    return res.status(401).send();
  }

  try {
    const accessToken = match[1];
    if (!accessToken) {
      return res.status(401, 'Not authorized').send();
    }
    req.jwt = await oktaJwtVerifier.verifyAccessToken(accessToken, audience);
    next();
  } catch (err) {
    return res.status(401).send(err.message);
  }
};


export default authenticationRequired;