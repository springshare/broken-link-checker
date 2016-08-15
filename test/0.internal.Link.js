"use strict";
const helpers  = require("./helpers");
const Link     = require("../lib/internal/Link");
const urlTests = require("./helpers/json/Link.json");

const expect = require("chai").expect;
const URL = require("whatwg-url").URL;



describe("INTERNAL -- Link", function()
{
	describe(".create()", function()
	{
		it("works", function()
		{
			expect( Link.create() ).to.be.like(
			{
				base: {},
				broken_link_checker: true,
				html: {},
				http: {},
				url: {}
			});
		});
	});
	
	
	
	describe(".isLink()", function()
	{
		it("works", function()
		{
			expect( Link.isLink( Link.create() ) ).to.be.true;
			expect( Link.isLink( {} ) ).to.be.false;
		});
	});
	
	
	
	describe(".resolve()", function()
	{
		it("supports String input", function()
		{
			const linkUrl = "http://domain.com";
			const link = Link.resolve(Link.create(), linkUrl, linkUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					original: linkUrl,
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased:  { protocol:"http:", hostname:"domain.com", pathname:"/" },
					redirected: null
				},
				base:
				{
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased : { protocol:"http:", hostname:"domain.com", pathname:"/" }
				},
				html: { tag:null },  // No HTML has been parsed
				http: { response:null },  // No request has been made
				internal: true,
				samePage: true,
				broken: null,
				brokenReason: null,
				excluded: null,
				excludedReason: null,
				broken_link_checker: true
			});
		});
		
		
		
		it("supports URL input", function()
		{
			const linkUrl = "http://domain.com/";
			const link = Link.resolve(Link.create(), new URL(linkUrl), new URL(linkUrl));
			
			expect(link).to.be.like(
			{
				url:
				{
					original: linkUrl,
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased:  { protocol:"http:", hostname:"domain.com", pathname:"/" },
					redirected: null
				},
				base:
				{
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased : { protocol:"http:", hostname:"domain.com", pathname:"/" }
				},
				html: { tag:null },  // No HTML has been parsed
				http: { response:null },  // No request has been made
				internal: true,
				samePage: true,
				broken: null,
				brokenReason: null,
				excluded: null,
				excludedReason: null,
				broken_link_checker: true
			});
		});
		
		
		
		it("supports combined input (#1)", function()
		{
			const linkUrl = "http://domain.com/";
			const link = Link.resolve(Link.create(), linkUrl, new URL(linkUrl));
			
			expect(link).to.be.like(
			{
				url:
				{
					original: linkUrl,
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased:  { protocol:"http:", hostname:"domain.com", pathname:"/" },
					redirected: null
				},
				base:
				{
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased : { protocol:"http:", hostname:"domain.com", pathname:"/" }
				},
				html: { tag:null },  // No HTML has been parsed
				http: { response:null },  // No request has been made
				internal: true,
				samePage: true,
				broken: null,
				brokenReason: null,
				excluded: null,
				excludedReason: null,
				broken_link_checker: true
			});
		});
		
		
		
		it("supports combined input (#2)", function()
		{
			const linkUrl = "http://domain.com/";
			const link = Link.resolve(Link.create(), new URL(linkUrl), linkUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					original: linkUrl,
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased:  { protocol:"http:", hostname:"domain.com", pathname:"/" },
					redirected: null
				},
				base:
				{
					resolved: { protocol:"http:", hostname:"domain.com", pathname:"/" },
					rebased : { protocol:"http:", hostname:"domain.com", pathname:"/" }
				},
				html: { tag:null },  // No HTML has been parsed
				http: { response:null },  // No request has been made
				internal: true,
				samePage: true,
				broken: null,
				brokenReason: null,
				excluded: null,
				excludedReason: null,
				broken_link_checker: true
			});
		});
		
		
		
		function hrefOrNot(attrs, data, property)
		{
			const value = data[property];
			
			if (value == null)
			{
				return `expect(${attrs}).to.be.${value};`;
			}
			else
			{
				return `expect(${attrs}.href).to.equal(${property});`;
			}
		}
		
		for (let test in urlTests)
		{
			const data = urlTests[test];
			const skipOrOnly = data.skipOrOnly==null ? "" : "."+data.skipOrOnly;
			const title = (data.resolvedLinkUrl!==null ? "accepts " : "rejects ") + helpers.a_an(test) +" "+ helpers.addSlashes(test);
			
			eval(`
				it${skipOrOnly}("${title}", function()
				{
					// Variable order coincides with the JSON
					const linkUrl         = ${helpers.format(data.linkUrl)};
					const baseUrl         = ${helpers.format(data.baseUrl)};
					const htmlBaseUrl     = ${helpers.format(data.htmlBaseUrl)};
					const resolvedLinkUrl = ${helpers.format(data.resolvedLinkUrl)};
					const resolvedBaseUrl = ${helpers.format(data.resolvedBaseUrl)};
					const rebasedLinkUrl  = ${helpers.format(data.rebasedLinkUrl)};
					const rebasedBaseUrl  = ${helpers.format(data.rebasedBaseUrl)};
					
					const link = Link.create();
					if (typeof htmlBaseUrl==="string") link.html.base = htmlBaseUrl;
					
					Link.resolve(link, linkUrl, baseUrl);
					
					expect(link.url.original).to.equal(linkUrl);
					${hrefOrNot("link.url.resolved",   data, "resolvedLinkUrl"  )}
					${hrefOrNot("link.url.rebased",    data, "rebasedLinkUrl"   )}
					//${hrefOrNot("link.url.redirected", data, "redirectedLinkUrl")}
					
					${hrefOrNot("link.base.resolved", data, "resolvedBaseUrl")}
					${hrefOrNot("link.base.rebased",  data, "rebasedBaseUrl" )}
					
					if (typeof htmlBaseUrl==="string") expect(link.html.base).to.equal(htmlBaseUrl);
					
					expect(link.internal).to.be.${data.internal};
					expect(link.samePage).to.be.${data.samePage};
				});
			`);
		}
		
		
		
		it("accepts a base with a scheme/protocol not specified as accepted", function()
		{
			const baseUrl = "smtp://domain.com/";
			const linkUrl = "http://domain.com/";
			const link = Link.resolve(Link.create(), linkUrl, baseUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					resolved: { href:linkUrl }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased:  { href:baseUrl }
				},
				internal: false,
				samePage: false
			});
		});
		
		
		
		it("accepts an html base with a scheme/protocol not specified as accepted", function()
		{
			const baseUrl     = "http://domain.com/";
			const htmlBaseUrl = "smtp://domain.com/";
			const linkUrl     = "http://domain.com/";
			
			const link = Link.create();
			link.html.base = htmlBaseUrl;
			Link.resolve(link, linkUrl, baseUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					resolved: { href:linkUrl }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased : { href:htmlBaseUrl }
				},
				internal: true,
				samePage: true
			});
		});
		
		
		
		it("accepts an absolute url with a scheme/protocol not specified as accepted", function()
		{
			const baseUrl = "http://domain.com/";
			const linkUrl = "smtp://domain.com/";
			const link = Link.resolve(Link.create(), linkUrl, baseUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					resolved: { href:linkUrl },
					rebased:  { href:linkUrl }
				},
				internal: false,
				samePage: false
			});
		});
		
		
		
		it("rejects a relative url with a base containing a scheme/protocol not specified as accepted", function()
		{
			const baseUrl = "smtp://domain.com/";
			const linkUrl = "path/resource.html?query#hash";
			const link = Link.resolve(Link.create(), linkUrl, baseUrl);
			
			expect(link).to.be.like(
			{
				url:
				{
					original: linkUrl,
					resolved: { href:baseUrl+linkUrl },
					rebased:  { href:baseUrl+linkUrl }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased:  { href:baseUrl }
				},
				internal: true,
				samePage: false
			});
		});
	});
	
	
	
	describe(".redirect()", function()
	{
		it("works", function()
		{
			const baseUrl        = "http://domain1.com/file1.html";
			const linkUrl        = "http://domain1.com/file2.html";
			const redirectedUrl1 = "http://domain1.com/file3.html";
			const redirectedUrl2 = "http://domain2.com/file.html";
			const redirectedUrl3 = "https://domain1.com/file.html";
			
			function link(redirectedUrl)
			{
				const link = Link.resolve(Link.create(), linkUrl, baseUrl);
				Link.redirect(link, redirectedUrl);
				return link;
			}
			
			expect(link(redirectedUrl1)).to.be.like(
			{
				url:
				{
					original:   linkUrl,
					resolved:   { href:linkUrl },
					rebased:    { href:linkUrl },
					redirected: { href:redirectedUrl1 }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased:  { href:baseUrl }
				},
				internal: true,
				samePage: false
			});
			
			expect(link(redirectedUrl2)).to.be.like(
			{
				url:
				{
					original:   linkUrl,
					resolved:   { href:linkUrl },
					rebased:    { href:linkUrl },
					redirected: { href:redirectedUrl2 }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased:  { href:baseUrl }
				},
				internal: false,
				samePage: false
			});
			
			expect(link(redirectedUrl3)).to.be.like(
			{
				url:
				{
					original:   linkUrl,
					resolved:   { href:linkUrl },
					rebased:    { href:linkUrl },
					redirected: { href:redirectedUrl3 }
				},
				base:
				{
					resolved: { href:baseUrl },
					rebased:  { href:baseUrl }
				},
				internal: false,
				samePage: false
			});
		});
	});
});
