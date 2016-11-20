"use strict";
const checkUrl     = require("../internal/checkUrl");
const Link         = require("../internal/Link");
const parseOptions = require("../internal/parseOptions");

const {EventEmitter} = require("events");
const RequestQueue = require("limited-request-queue");
const URLCache = require("urlcache");



class UrlChecker extends EventEmitter
{
	constructor(options)
	{
		super();
		
		this.options = options = parseOptions(options);
	
		this.cache = new URLCache(
		{
			expiryTime: this.options.cacheExpiryTime,
			normalize: false  // TODO :: should be true when not used by `HtmlChecker`
		});
		
		this.linkQueue = new RequestQueue(
		{
			maxSockets:        this.options.maxSockets,
			maxSocketsPerHost: this.options.maxSocketsPerHost,
			rateLimit:         this.options.rateLimit
		})
		.on("item", (url, data, done) =>
		{
			checkUrl(data.link, data.auth, this.cache, this.options).then(result =>
			{
				this.emit("link", result, data.customData);
				
				// Auto-starts next queue item, if any
				// If not, fires "end"
				done();
			});
		})
		.on("end", () => this.emit("end"));
	}
	
	
	
	clearCache()
	{
		this.cache.clear();
		return this;
	}
	
	
	
	dequeue(id)
	{
		return this.linkQueue.dequeue(id);
	}
	
	
	
	// `auth` is undocumented and for internal use only
	enqueue(url, customData, auth={})
	{
		let link;
		
		// Undocumented internal use: `enqueue(Link)`
		if (Link.isLink(url))
		{
			link = url;
		}
		// Documented use: `enqueue(url)`
		// or erroneous and let linkQueue sort it out
		else
		{
			// TODO :: if `url` contains auth, it'll need to override `auth`
			link = Link.resolve(Link.create(), url);
		}
		
		return this.linkQueue.enqueue(link.url.rebased, { auth, customData, link });
	}
	
	
	
	numActiveLinks()
	{
		return this.linkQueue.numActive;
	}
	
	
	
	numQueuedLinks()
	{
		return this.linkQueue.numQueued;
	}
	
	
	
	pause()
	{
		this.linkQueue.pause();
		return this;
	}
	
	
	
	resume()
	{
		this.linkQueue.resume();
		return this;
	}
	
	
	
	__getCache()
	{
		return this.cache;
	}
}



module.exports = UrlChecker;
