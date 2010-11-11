/*
   This file is part of MusicBrainz, the open internet music database.
   Copyright (c) 2005 Stefan Kestenholz (keschte)
   Copyright (C) 2010 MetaBrainz Foundation

   This program is free software; you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation; either version 2 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program; if not, write to the Free Software
   Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.

*/

MB.GuessCase = (MB.GuessCase) ? MB.GuessCase : {};
MB.GuessCase.Mode = (MB.GuessCase.Mode) ? MB.GuessCase.Mode : {};

MB.GuessCase.Mode._fix = function (name, re, replace) {
    var self = MB.Object ();

    self.name = name;
    self.re = re;
    self.replace = replace;

    return self;
}

/**
 * Models a GuessCase mode.
 **/
MB.GuessCase.Mode.Base = function () {
    var self = MB.Object ();

    self.fix = MB.GuessCase.Mode._fix;

    // ----------------------------------------------------------------------------
    // member functions
    // ---------------------------------------------------------------------------

    /**
     * Set the instance variables.
     */
    self.setConfig = function(name, desc, url) {

	self._name = name;
	self._desc = (desc || "");
	self._url = (url || "");

    };

    self.getName = function() { return self._name; };
    self.getURL = function() { return self._url; };

    /**
     * Returns the type of this mode
     **/
    self.getDescription = function() {

	var s = self._desc;
	s = s.replace('[url]', '<a href="'+self.getURL()+'" target="_blank">'+self.getName()+' ');
	s = s.replace('[/url]', '</a>');
	return s;
    };

    /**
     * Returns true if the GC script is operating in sentence mode
     **/
    self.isSentenceCaps = function() { return true; };

    // ----------------------------------------------------------------------------
    // mode specific functions
    // ---------------------------------------------------------------------------

    /**
     * Words which are always written lowercase.
     * -------------------------------------------------------
     * tma			2005-01-29		first version
     * keschte		2005-04-17		added french lowercase characters
     * keschte		2005-06-14		added "tha" to be handled like "the"
     **/
    self.getLowerCaseWords = function() {
	return ["a","and","n","an","as","at","but","by","for","in",
		"nor","of","o","on","or","the","to","tha"];
    };
    self.isLowerCaseWord = function(w) {

	if (!self.lowerCaseWords) {
	    self.lowerCaseWords = gc.u.toAssocArray(self.getLowerCaseWords());
	}
	return gc.u.inArray(self.lowerCaseWords,w);

    }; // lowercase_words

    /**
     * Words which are always written uppercase.
     * -------------------------------------------------------
     * keschte		2005-01-31		first version
     * various		2005-05-05		added "FM...PM"
     * keschte		2005-05-24		removed AM,PM because it yielded false positives e.g. "I AM stupid"
     * keschte		2005-07-10		added uk,bpm
     * keschte		2005-07-20		added ussr,usa,ok,nba,rip,ny,classical words,hip-hop artists
     * keschte		2005-10-24		removed AD
     * keschte		2005-11-15		removed RIP (Let Rip) is not R.I.P.
     **/
    self.getUpperCaseWords = function() {
	return [
	    "dj", "mc", "tv", "mtv", "ep", "lp",
	    "ymca", "nyc", "ny", "ussr", "usa", "r&b",
	    "bbc", "fm", "bc", "ac", "dc", "uk", "bpm", "ok", "nba",
	    "rza", "gza", "odb", "dmx", "2xlc" // artists
	];
    };
    self.getRomanNumberals = function() {
	return ["i","ii","iii","iv","v","vi","vii","viii","ix","x"];
    };
    self.isUpperCaseWord = function(w) {

	if (!self.upperCaseWords) {
	    self.upperCaseWords = gc.u.toAssocArray(self.getUpperCaseWords());
	}
	if (!self.romanNumerals) {
	    self.romanNumerals = gc.u.toAssocArray(self.getRomanNumberals());
	}
	var f = gc.u.inArray(self.upperCaseWords, w);
	if (!f && gc.isConfigTrue(gc.CFG_UC_ROMANNUMERALS)) {
	    f = gc.u.inArray(self.romanNumerals, w);
	}

	return f;
    }; // uppercase_words

    /**
     * Pre-process to find any lowercase_bracket word that needs to be put into parentheses.
     * starts from the back and collects words that belong into
     * the brackets: e.g.
     * My Track Extended Dub remix => My Track (extended dub remix)
     * My Track 12" remix => My Track (12" remix)
     **/
    self.prepExtraTitleInfo = function(w) {

	var lastword = w.length-1, wi = lastword;
	var handlePreProcess = false;
	var isDoubleQuote = false;
	while (((w[wi] == " ") || // skip whitespace
		(w[wi] == '"' && (w[wi-1] == "7" || w[wi-1] == "12")) || // vinyl 7" or 12"
		((w[wi+1] || "") == '"' && (w[wi] == "7" || w[wi] == "12")) ||
		(gc.u.isPrepBracketWord(w[wi]))) &&
	       wi >= 0) {
	    handlePreProcess = true;
	    wi--;
	}

	// Down-N-Dirty (lastword = dirty)
	// Dance,Dance,Dance (lastword = dance) get matched by the preprocessor,
	// but are a single word which can occur at the end of the string.
	// therefore, we don't put the single word into parens.

	// trackback the skipped spaces spaces, and then slurp the
	// next word, so see which word we found.
	if (wi < lastword) {
	    // the word at wi broke out of the loop above,
	    // is not extra title info.
	    wi++;
	    while (w[wi] == " " && wi < lastword) {
		wi++; // skip whitespace
	    }

	    // if we have a single word that needs to be put
	    // in parantheses, consult the list of words
	    // were we do not do it, else continue.
	    var probe = w[lastword];
	    if ((wi == lastword) &&
		(gc.u.isPrepBracketSingleWord(probe))) {

		handlePreProcess = false;
	    }
	    if (handlePreProcess && wi > 0 && wi <= lastword) {
		var nw = w.slice(0, wi);
		if (nw[wi-1] == "(") { nw.pop(); }
		if (nw[wi-1] == "-") { nw.pop(); }
		nw[nw.length] = "(";
		nw = nw.concat(w.slice(wi,w.length));
		nw[nw.length] = ")";
		w = nw;

	    }
	}
	return w;
    };

    /**
     * Replace unicode special characters with their ascii equivalent
     * Note:	this function is run before all guess types
     *			(artist|release|track)
     *
     * keschte		2005-11-10		first version
     **/
    self.preProcessCommons = function(is) {

	if (!gc.re.PREPROCESS_COMMONS) {
    	    gc.re.PREPROCESS_COMMONS = [
		self.fix ("D.J. -> DJ", /(\b|^)D\.?J\.?(\s|\)|$)/i, "DJ")
		, self.fix ("M.C. -> MC", /(\b|^)M\.?C\.?(\s|\)|$)/i, "MC")

		// http://unicode.e-workers.de/wgl4.php
		// http://www.cs.sfu.ca/~ggbaker/reference/characters/
		// single quotes
		, self.fix ("Opening single-quote &#x2018;", "\u2018", "'")
		, self.fix ("Closing single-quote &#x2019;", "\u2019", "'")

		// weird single quotes.
		, self.fix ("Acute accent &#x0301;", "\u0301", "'")
		, self.fix ("Acute accent &#x00B4;", "\u00B4", "'")
		, self.fix ("Grave accent &#x0300;", "\u0300", "'")
		, self.fix ("Backtick &#x0060;", "\u0060", "'")
		, self.fix ("Prime &#x2023;", "\u2023", "'")

		// double quotes
		, self.fix ("Opening double-quote &#x201C;", "\u201C", "\"")
		, self.fix ("Closing double-quote &#x201D;", "\u201D", "\"")

		// hyphens
		, self.fix ("Soft hyphen &#x00AD;", "\u00AD", "-")
		, self.fix ("Closing Hyphen &#x2010;", "\u2010", "-")
		, self.fix ("Non-breaking hyphen &#x2011;", "\u2011", "-")
		, self.fix ("En-dash &#x2013;", "\u2013", "-")
		, self.fix ("Em-dash &#x2014;", "\u2014", "-")
		, self.fix ("hyphen bullet &#x2043;", "\u2043", "-")
		, self.fix ("Minus sign &#x2212;", "\u2212", "-")

		// ellipsis
		, self.fix ("Ellipsis &#x2026;", "\u2026", "...")
	    ];
	}
	return self.runFixes(is, gc.re.PREPROCESS_COMMONS);
    };

    /**
     * Take care of mis-spellings that need to be fixed before
     * splitting the string into words.
     * Note: 	this function is run before release and track guess
     *   		types (not for artist)
     *
     * keschte		2005-11-10		first version
     **/
    self.preProcessTitles = function(is) {

	if (!gc.re.PREPROCESS_FIXLIST) {
	    gc.re.PREPROCESS_FIXLIST = [

		// trim spaces from brackets.
		self.fix ("spaces after opening brackets", /(^|\s)([\(\{\[])\s+($|\b)/i, "$2" )
		, self.fix ("spaces before closing brackets", /(\b|^)\s+([\)\}\]])($|\b)/i, "$2" )

		// remix variants
		, self.fix ("re-mix -> remix", /(\b|^)re-mix(\b)/i, "remix" )
		, self.fix ("re-mix -> remix", /(\b|^)re-mix(\b)/i, "remix" )
		, self.fix ("remx -> remix", /(\b|^)remx(\b)/i, "remix" )
		, self.fix ("re-mixes -> remixes", /(\b|^)re-mixes(\b)/i, "remixes" )
		, self.fix ("re-make -> remake", /(\b|^)re-make(\b)/i, "remake" )
		, self.fix ("re-makes -> remakes", /(\b|^)re-makes(\b)/i, "remakes" )
 		, self.fix ("re-edit variants, prepare for postprocess", /(\b|^)re-?edit(\b)/i, "re_edit" )
		, self.fix ("RMX -> remix", /(\b|^)RMX(\b)/i, "remix" )

		// extra title information
		, self.fix ("alt.take -> alternate take", /(\b|^)alt[\.]? take(\b)/i, "alternate take")
		, self.fix ("instr. -> instrumental", /(\b|^)instr\.?(\b)/i, "instrumental")
		, self.fix ("altern. -> alternate", /(\b|^)altern\.?(\s|\)|$)/i, "alternate" )
		, self.fix ("orig. -> original", /(\b|^)orig\.?(\s|\)|$)/i, "original" )
		, self.fix ("ver(s). -> version", /(\b|^)vers?\.(\s|\)|$)/i, "version" )
		, self.fix ("Extendet -> extended", /(\b|^)Extendet(\b)/i, "extended" )
		, self.fix ("extd. -> extended", /(\b|^)ext[d]?\.?(\s|\)|$)/i, "extended" )

		// also known as
		, self.fix ("aka -> a.k.a.", /(\b|^)aka(\b)/i, "a.k.a." )

		// featuring variant
		, self.fix ("/w -> ft. ", /(\s)[\/]w(\s)/i, "ft." )
		, self.fix ("f. -> ft. ", /(\s)f\.(\s)/i, "ft." )
		, self.fix ("'featuring - ' -> feat", /(\s)featuring -(\s)/i, "feat" )

		// vinyl
		, self.fix ("12'' -> 12\"", /(\s|^|\()(\d+)''(\s|$)/i, "$2\"" )
		, self.fix ("12in -> 12\"", /(\s|^|\()(\d+)in(ch)?(\s|$)/i, "$2\"" )

		// combined word hacks, e.g. replace spaces with underscores,
		// (e.g. "a cappella" -> a_capella), such that it can be handled
		// correctly in post-processing
		, self.fix ("A Capella preprocess", /(\b|^)a\s?c+ap+el+a(\b)/i, "a_cappella" )
		, self.fix ("OC ReMix preprocess", /(\b|^)oc\sremix(\b)/i, "oc_remix" )

		// Handle Part/Volume abbreviations
		, self.fix ("Standalone Pt. -> Part", /(^|\s)Pt\.?(\s|$)/i, "Part" )
		, self.fix ("Standalone Pts. -> Parts", /(^|\s)Pts\.(\s|$)/i, "Parts" )
		, self.fix ("Standalone Vol. -> Volume", /(^|\s)Vol\.(\s|$)/i, "Volume" )

		// Get parts out of brackets
		// Name [Part 1] -> Name, Part 1
		// Name (Part 1) -> Name, Part 1
		// Name [Parts 1] -> Name, Parts 1
		// Name (Parts 1-2) -> Name, Parts 1-2
		// Name (Parts x & y) -> Name, Parts x & y
		, self.fix ("(Pt) -> , Part", /((,|\s|:|!)+)([\(\[])?\s*(Part|Pt)[\.\s#]*((\d|[ivx]|[\-,&\s])+)([\)\]])?(\s|:|$)/i, "Part $5")
		, self.fix ("(Pts) -> , Parts", /((,|\s|:|!)+)([\(\[])?\s*(Parts|Pts)[\.\s#]*((\d|[ivx]|[\-&,\s])+)([\)\]])?(\s|:|$)/i, "Parts $5")
		, self.fix ("(Vol) -> , Volume", /((,|\s|:|!)+)([\(\[])?\s*(Volume|Vol)[\.\s#]*((\d|[ivx]|[\-&,\s])+)([\)\]])?(\s|:|$)/i, "Volume $5")
		, self.fix (": Part -> , Part", /(\b|^): Part(\b)/i, ", part" )
		, self.fix (": Parts -> , Parts", /(\b|^): Part(\b)/i, ", parts" )
	    ];
	}

	return self.runFixes(is, gc.re.PREPROCESS_FIXLIST);
    };

    /**
     * Collect words from processed wordlist and apply minor fixes that
     * aren't handled in the specific function.
     **/
    self.runPostProcess = function(is) {

	if (!gc.re.POSTPROCESS_FIXLIST) {
	    gc.re.POSTPROCESS_FIXLIST = [

		// see combined words hack in preProcessTitles
		self.fix ("a_cappella inside brackets", /(\b|^)a_cappella(\b)/, "a cappella")
		, self.fix ("a_cappella outside brackets", /(\b|^)A_cappella(\b)/, "A Cappella")
		, self.fix ("oc_remix", /(\b|^)oc_remix(\b)/i, "OC ReMix")
		, self.fix ("re_edit inside brackets", /(\b|^)Re_edit(\b)/, "re-edit")

		// TODO: check if needed?
		, self.fix ("whitespace in R&B", /(\b|^)R\s*&\s*B(\b)/i, "R&B")
		, self.fix ("[live] to (live)", /(\b|^)\[live\](\b)/i, "(live)")
		, self.fix ("Djs to DJs", /(\b|^)Djs(\b)/i, "DJs")
		, self.fix ("a.k.a. lowercase", /(\s|^)A\.K\.A\.(\s|$)/i, "a.k.a.")
		, self.fix ("Rock 'n' Roll", /(\s|^)Rock '?n'? Roll(\s|$)/i, "Rock 'n' Roll")
	    ];
	}
	var os = self.runFixes(is, gc.re.POSTPROCESS_FIXLIST);
	if (is != os) {
            is = os;
	}
	return os;
    };

    /**
     * Iterate through the list array and apply the fixes to string is
     *
     * @param is	the input string
     * @param list	the list of fix objects to apply.
     **/
    self.runFixes = function(is, list) {

	var matcher = null;
	var len = list.length;
	for (var i=0; i<len; i++) {
	    var f = list[i];
            
	    if (f && f.name) {
		var fixName = "Replaced " + f.name;
		var find = f.re;
		var replace = f.replace;

		if (typeof(find) == 'string') {

		    // iterate through the whole string and replace. there could
		    // be multiple occurences of the search string.
		    var pos = 0;
		    while ((pos = is.indexOf(find, pos)) != -1) {
			is = is.replace(find, replace);
		    }
		} else if ((matcher = is.match(find)) != null) {
		    // get reference to first set of parentheses
		    var a = matcher[1];
		    a = (MB.utility.isNullOrEmpty(a) ? "" : a);

		    // get reference to last set of parentheses
		    var b = matcher[matcher.length-1];
		    b = (MB.utility.isNullOrEmpty(b) ? "" : b);

		    // compile replace string
		    var rs = [a,replace,b].join("");
		    is = is.replace(find, rs);
		}
	    }
	}
	return is;
    };

    /**
     * Take care of (bonus),(bonus track)
     **/
    self.stripInformationToOmit = function(is) {

	if (!gc.re.PREPROCESS_STRIPINFOTOOMIT) {
	    gc.re.PREPROCESS_STRIPINFOTOOMIT = [
		self.fix ("Trim 'bonus (track)?'", /[\(\[]?bonus(\s+track)?s?\s*[\)\]]?$/i, ""),
		self.fix ("Trim 'retail (version)?'", /[\(\[]?retail(\s+version)?\s*[\)\]]?$/i, "")
	    ];
	}
	var os = is, list = gc.re.PREPROCESS_STRIPINFOTOOMIT;
	for (var i=list.length-1; i>=0; i--) {
	    var matcher = null;
	    var listItem = list[i];
	    var fixName = "Replaced " + listItem.name;
	    var find = listItem.re;
	    var replace = listItem.replace;
	    if ((matcher = os.match(find)) != null) {
		os = os.replace(find, replace);
	    }
	}

	return os;
    };

    /**
     * Look for, and convert vinyl expressions
     * * look only at substrings which start with ' '  OR '('
     * * convert 7',7'',7",7in,7inch TO '7"_' (with a following SPACE)
     * * convert 12',12'',12",12in,12inch TO '12"_' (with a following SPACE)
     * * do NOT handle strings like 80's
     * Examples:
     *  Original string: "Fine Day (Mike Koglin 12' mix)"
     *  	Last matched portion: " 12' "
     *  	Matched portion 1 = " "
     *  	Matched portion 2 = "12'"
     *  	Matched portion 3 = "12"
     *  	Matched portion 4 = "'"
     *  	Matched portion 5 = " "
     *  Original string: "Where Love Lives (Come on In) (12"Classic mix)"
     *  	Last matched portion: "(12"C"
     *  	Matched portion 1 = "("
     *  	Matched portion 2 = "12""
     *  	Matched portion 3 = "12"
     *  	Matched portion 4 = """
     *  	Matched portion 5 = "C"
     *  Original string: "greatest 80's hits"
     * 		Match failed.
     **/
    self.runFinalChecks = function(is) {

	if (!gc.re.VINYL) {
	    gc.re.VINYL = /(\s+|\()((\d+)[\s|-]?(inch\b|in\b|'+|"))([^s]|$)/i;
	}
	var matcher = null, os = is;
	if ((matcher = is.match(gc.re.VINYL)) != null) {
	    var mindex = matcher.index;
	    var mlenght  = matcher[1].length + matcher[2].length + matcher[5].length; // calculate the length of the expression
	    var firstPart = is.substring(0, mindex);
	    var lastPart = is.substring(mindex + mlenght, is.length); // add number
	    var parts = []; // compile the vinyl designation.
	    parts.push(firstPart);
	    parts.push(matcher[1]); // add matched first expression (either ' ' or '('
	    parts.push(matcher[3]); // add matched number, but skip the in, inch, '' part
	    parts.push('"'); // add vinyl doubleqoute
	    parts.push((matcher[5]) != " " && matcher[5] != ")" && matcher[5] != "," ? " " : ""); // add space after ",if none is present and next character is not ")" or ","
	    parts.push(matcher[5]); // add first character of next word / space.
	    parts.push(lastPart); // add rest of string
	    os = parts.join("");
	}
	return os;
    };

    /**
     * Delegate function for Mode specific word handling.
     * This is mostly used for context based titling changes.
     *
     * @return	false, such that the normal word handling can
     *			take place for the current word, if that should
     * 			not be done, return true.
     **/
    self.doWord = function() {
	return false;
    };

    return self;
};