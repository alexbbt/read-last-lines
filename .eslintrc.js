module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "space-before-function-paren": [
            "error", {
                "anonymous": "never",
                "named": "never",
                "asyncArrow": "never"
            },
        ],
        "arrow-spacing": [
            "error", {
                "before": true,
                "after": true
            },
        ],
        "comma-dangle": ["error", "always-multiline"],
    }
};
