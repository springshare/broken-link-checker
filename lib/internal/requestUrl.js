"use strict";
const bhttp = require("bhttp");
const broquire = require("broquire")(require);
const specurl = require("specurl");



function requestUrl(url, method/*, auth*/, options, retry)
{
	method = method.toLowerCase();
	
	// TODO :: do we need the isURL check?
	return Promise.resolve( specurl.isURL(url) ).then( function(result)
	{
		if (result === false) throw new TypeError("Invalid URL");
		
		return bhttp.request(url.href,  // TODO :: https://github.com/joepie91/node-bhttp/issues/3
		{
			//auth: auth,
			discardResponse: true,
			headers: { "user-agent":options.userAgent },
			method: method,
			rejectUnauthorized: false,  // accept self-signed SSL certificates
			stream: method !== "head"
		});
	})
	.then( function(response)
	{
		if (response.statusCode===405 && method==="head" && options.retry405Head===true && retry!==true)
		{
			// Retry possibly broken server with "get"
			return requestUrl(url, "get"/*, auth*/, options, true);
		}
		
		else if (method==="get" && retry!==true)
		{
			return { response:simplifyResponse(response), stream:response };
		}
		else
		{
			return { response:simplifyResponse(response) };
		}
	});
}



function simplifyResponse(response)
{
	const simplified = simplifyResponse2(response);
	simplified.redirects = [];
	
	for (let i=0; i<response.redirectHistory.length; i++)
	{
		simplified.redirects.push( simplifyResponse2(response.redirectHistory[i]) );
	}
	
	return simplified;
}



function simplifyResponse2(response)
{
	return {
		headers:    response.headers,
		status:     response.statusCode,
		statusText: response.statusMessage,
		url:        specurl.parse(response.request.url)
	};
}



module.exports = requestUrl;
