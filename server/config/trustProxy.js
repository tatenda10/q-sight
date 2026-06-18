const parseTrustProxy = (value) => {
  if (value === undefined || value === null || value === '') {
    return process.env.NODE_ENV === 'production' ? 1 : false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  const numericValue = Number(normalized);
  if (!Number.isNaN(numericValue) && Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return value;
};

const applyTrustProxy = (app, logger = console) => {
  const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
  app.set('trust proxy', trustProxy);

  if (logger && typeof logger.info === 'function') {
    logger.info(`Express trust proxy set to: ${trustProxy}`);
  }

  return trustProxy;
};

module.exports = {
  applyTrustProxy,
  parseTrustProxy
};
