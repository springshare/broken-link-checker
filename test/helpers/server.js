"use strict";
const fixture = require("./fixture");

const escapeStringRegexp = require("escape-string-regexp");
const fs = require("fs");
const nock = require("nock");
const specurl = require("specurl");



function addDeadMock(...urls)
{
	const error = new Error("mocked ECONNREFUSED");
	const pattern = pathPattern("/path/to/resource.html");
	
	error.code = "ECONNREFUSED";
	
	for (let i=0; i<urls.length; i++)
	{
		nock(urls[i])
		.get(pattern).times(Infinity).replyWithError(error)
		.head(pattern).times(Infinity).replyWithError(error);
	}
}



function addMock(...urls)
{
	for (let i=0; i<urls.length; i++)
	{
		let mock = nock(urls[i]);
		
		intercept(mock, 
		{
			path: ["/", "/index.html"],
			methods: 
			{
				all:
				{
					body: stream("/index.html"),
					headers: { "content-type":"text/html" },
					statusCode: 200
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/circular-redirect/redirect.html",
			methods: 
			{
				all:
				{
					headers: { location:"/circular-redirect/redirected.html" },
					statusCode: 302
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/disallowed/header.html",
			methods: 
			{
				all:
				{
					body: stream("/disallowed/header.html"),
					headers:
					{
						"content-type": "text/html",
						"x-robots-tag": "nofollow"/*,
						"x-robots-tag: unavailable_after": "1-Jan-3000 00:00:00 EST"*/
					},
					statusCode: 200
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/method-not-allowed/any.html",
			methods: 
			{
				all: { statusCode:405 }
			}
		});
		
		intercept(mock, 
		{
			path: "/method-not-allowed/head.html",
			methods: 
			{
				get:
				{
					body: stream("/method-not-allowed/head.html"),
					statusCode: 200
				},
				head:
				{
					statusCode: 405
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/non-html/empty",
			methods: 
			{
				all:
				{
					body: stream("/non-html/empty"),
					statusCode: 200
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/non-html/image.gif",
			methods: 
			{
				all:
				{
					body: stream("/non-html/image.gif"),
					headers: { "content-type":"image/gif" },
					statusCode: 200
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/normal/fake.html",
			methods: 
			{
				all: { statusCode:404 }
			}
		});
		
		intercept(mock, 
		{
			path: "/redirect/redirect.html",
			methods: 
			{
				all:
				{
					headers: { location:"/redirect/redirect2.html" },
					statusCode: 302
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/redirect/redirect2.html",
			methods: 
			{
				all:
				{
					headers: { location:"/redirect/redirected.html" },
					statusCode: 301
				}
			}
		});
		
		intercept(mock, 
		{
			path: "/robots.txt",
			methods: 
			{
				all:
				{
					body: stream("/robots.txt"),
					headers: { "content-type":"text/plain" },
					statusCode: 200
				}
			}
		});
		
		[
			"/circular/index.html",
			"/circular/no-links.html",
			"/circular/with-links.html",
			"/circular-redirect/redirected.html",
			"/disallowed/header2.html",
			"/disallowed/index.html",
			"/disallowed/meta.html",
			"/disallowed/meta2.html",
			"/disallowed/rel.html",
			"/disallowed/rel2.html",
			"/disallowed/robots-txt.html",
			"/disallowed/robots-txt2.html",
			"/external-redirect/index.html",
			"/external-redirect/redirected.html",
			"/normal/index.html",
			"/normal/no-links.html",
			"/normal/with-links.html",
			"/redirect/index.html",
			"/redirect/redirected.html"
		]
		.forEach(path =>
		{
			intercept(mock, 
			{
				path: path,
				methods: 
				{
					all:
					{
						body: stream(path),
						headers: { "content-type":"text/html" },
						statusCode: 200
					}
				}
			});
		});
		
		// These fixtures require multiple mocks
		if (urls.length >= 2)
		{
			if (i === 0)
			{
				let redirectedUrl = specurl.parse(urls[1]);
				redirectedUrl.path = "/external-redirect/redirected.html";
				
				// Redirect first mock to next mock
				// TODO :: make this more explicit in test suite somehow -- special case object for server, created per test?
				intercept(mock, 
				{
					path: "/external-redirect/redirect.html",
					methods: 
					{
						all:
						{
							headers: { location:redirectedUrl.href },
							statusCode: 302
						}
					}
				});
			}
		}
		else
		{
			// Cannot redirect to another mock -- make sure test fails
			intercept(mock, 
			{
				path: "/external-redirect/redirect.html",
				methods: 
				{
					all: { statusCode:500 }
				}
			});
		}
	}
}



function intercept(nockInstance, config)
{
	if (config.methods.all != null)
	{
		config.methods.get  = config.methods.all;
		config.methods.head = config.methods.all;
	}
	
	if (Array.isArray(config.path) === false)
	{
		config.path = [config.path];
	}
	
	config.path.forEach(path =>
	{
		const pattern = pathPattern(path);
		
		if (config.methods.get != null)
		{
			nockInstance.get(pattern).times(Infinity).reply((url, requestBody) =>
			{
				const body = (typeof config.methods.get.body === "function") ? config.methods.get.body() : null;
				
				return [config.methods.get.statusCode, body, config.methods.get.headers];
			});
		}
		
		if (config.methods.head != null)
		{
			nockInstance.head(pattern).times(Infinity).reply((url, requestBody) =>
			{
				return [config.methods.head.statusCode, null, config.methods.head.headers];
			});
		}
	});
}



function pathPattern(path)
{
	path = escapeStringRegexp(path);
	
	path += "(?:\\?(?:.+)?)?";  // adds support for possible queries
	path += "(?:\\#(?:.+)?)?";  // adds support for possible hashes
	
	return new RegExp("^" + path + "$");
}



function removeMocks()
{
	nock.cleanAll();
}



function stream(path)
{
	return function()
	{
		return fs.createReadStream( fixture.path(path) );
	};
}



module.exports = 
{
	start: addMock,
	startDead: addDeadMock,
	stop: removeMocks
};
