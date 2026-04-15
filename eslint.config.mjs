// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config from '@iobroker/eslint-config';

export default [
	...config,
	{
		// specify files to exclude from linting here
		ignores: [
			'.dev-server/',
			'.vscode/',
			'*.test.js',
			'test/**/*.js',
			'*.config.mjs',
			'build',
			'dist',
			'admin/words.js',
			'admin/admin.d.ts',
			'admin/blockly.js',
			'**/adapter-config.d.ts',
			'widgets/**/*.js'
		],
	},
	{
		// you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
		// as this improves maintainability. jsdoc warnings will not block build process.
		rules: {
            'jsdoc/require-jsdoc': 'off',
            "require-await": "off",
            "@typescript-eslint/require-await": "off",
            "no-unused-vars": "off",
            "unicorn/numeric-separators-style": [
                "warn",
                {
                    "number": { "minimumDigits": 5, "groupLength": 3 },
                    "hexadecimal": { "minimumDigits": 0, "groupLength": 2 },
                    "binary": { "minimumDigits": 0, "groupLength": 4 },
                    "octal": { "minimumDigits": 0, "groupLength": 3 }
                }
            ]
            // or "@typescript-eslint/no-unused-vars": "off",
        },
	},
];