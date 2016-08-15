"use strict";
const Link       = require("./Link");
const reasons    = require("./messages").reasons;
const requestUrl = require("./requestUrl");

const extend = require("extend");
const specurl = require("specurl");



function checkHttpUrl(link, cache, options)
{
	const request = requestUrl(link.url.rebased, options.requestMethod/*, auth*/, options).then( function(result)
	{
		const response = result.response;
		
		if (options.cacheResponses === true)
		{
			// TODO :: move cache logic to `redirectUrl` for use in `streamHtml`
			
			// TODO :: `specurl.relation(url,url,true)` since UrlCache doesn't deep-search queries for its keys
			if (response.url.href !== link.url.rebased.href)
			{
				cache.set(response.url, result.response);
			}
			
			// TODO :: this needs a test
			for (let i=0; i<response.redirects.length; i++)
			{
				let redirect = response.redirects[i];
				
				if (cache.get(redirect.url) === undefined)
				{
					cache.set(redirect.url, redirect);
				}
			}
		}
		
		return response;
	})
	.catch(error => error);  // will be stored as a response
	
	if (options.cacheResponses === true)
	{
		// Make future response available to `cache.get()` before completion
		cache.set(link.url.rebased, request);
	}
	
	// Send link to caller
	return request.then( function(response)
	{
		copyResponseData(response, link, options);
		
		link.http.cached = false;
		
		return link;
	});
}



/*
	Checks a URL to see if it's broken or not.
*/
function checkUrl(link, cache, options)
{
	// TODO :: move out to a `Link.invalidate()` to share with `HtmlChecker()` ?
	if (link.url.rebased===null || options.acceptedSchemes[link.url.rebased.protocol]!==true)
	{
		link.broken = true;
		link.brokenReason = "BLC_INVALID";
		return Promise.resolve(link);
	}
	
	if (options.cacheResponses === true)
	{
		let cached = cache.get(link.url.rebased);
		
		if (cached !== undefined)
		{
			return Promise.resolve(cached).then( function(response)
			{
				copyResponseData(response, link, options);
				
				link.http.cached = true;
				
				return link;
			});
		}
	}
	
	return checkHttpUrl(link, cache, options);
}



/*
	Copy data from a `simpleResponse` object—either from a request or cache—
	into a link object.
*/
function copyResponseData(response, link, options)
{
	if (response instanceof Error === false)
	{
		if (response.status<200 || response.status>299)
		{
			link.broken = true;
			link.brokenReason = "HTTP_" + response.status;
		}
		else
		{
			link.broken = false;
		}
		
		if (options.cacheResponses === true)
		{
			// Deep-cloned to avoid mutations to cache
			link.http.response = extend({}, response);
		}
		else
		{
			link.http.response = response;
		}
		
		// TODO :: would a string check be sufficient?
		if (specurl.relation(response.url, link.url.rebased) < specurl.relation.PATH)
		{
			// TODO :: this needs a test
			// TODO :: test if redirected to a different protocol
			Link.redirect(link, response.url);
		}
	}
	else
	{
		link.broken = true;
		
		if (reasons["ERRNO_"+response.code] != null)
		{
			link.brokenReason = "ERRNO_" + response.code;
		}
		else
		{
			link.brokenReason = "BLC_UNKNOWN";
		}
	}
}



module.exports = checkUrl;
