
const authMiddleware = (req, res, next) => {
    if (req.session && req.session.user) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Please log in.' });
    }
};

module.exports = authMiddleware;
