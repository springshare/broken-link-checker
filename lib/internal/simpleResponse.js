"use strict";



function simpleResponse(response, url)
{
	var simplified = simplify(response, url);
	simplified.redirects = [];

	for (var i=0; i<response.request._redirect.redirects.length; i++)
	{
		simplified.redirects.push( simplify(response.request._redirect.redirects[i]) );
	}

	return simplified;
}



function simplify(response, url)
{
	return {
		headers:       response.headers,
		httpVersion:   response.httpVersion,
		statusCode:    response.statusCode,
		statusMessage: response.statusMessage,
		url:           url
	};
}



module.exports = simpleResponse;
