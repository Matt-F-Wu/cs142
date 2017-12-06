"use strict";


var crypto = require('crypto');
/*
 * Return a salted and hashed password entry from a
 * clear text password.
 * @param {string} clearTextPassword
 * @return {object} passwordEntry
 * where passwordEntry is an object with two string
 * properties:
 *      salt - The salt used for the password.
 *      hash - The sha1 hash of the password and salt
 */
function makePasswordEntry(clearTextPassword) {
    var salt = crypto.randomBytes(8).toString('hex');
    var sha1 = crypto.createHash('sha1');
    sha1.update(clearTextPassword + salt);
    var password_digest = sha1.digest('hex');
    console.log("salt is: " + salt);
    return {salt: salt, hash: password_digest};
}

/*
 * Return true if the specified clear text password
 * and salt generates the specified hash.
 * @param {string} hash
 * @param {string} salt
 * @param {string} clearTextPassword
 * @return {boolean}
 */
function doesPasswordMatch(hash, salt, clearTextPassword) {
    var sha1 = crypto.createHash('sha1');
    sha1.update(clearTextPassword + salt);
    var digest = sha1.digest('hex');
    return (digest === hash);

}

module.exports = {
    makePasswordEntry: makePasswordEntry,
    doesPasswordMatch: doesPasswordMatch
};