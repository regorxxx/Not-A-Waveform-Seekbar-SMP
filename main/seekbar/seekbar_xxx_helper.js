'use strict';
//24/01/23

// Dummy file to load existing helpers or independent file
{
	let bIncludeRel = true;
	try {include('..\\..\\helpers\\helpers_xxx_dummy.js');} catch(e) {bIncludeRel = false;}
	if (bIncludeRel) {
		include('..\\..\\helpers\\helpers_xxx_UI.js');
		include('..\\..\\helpers\\helpers_xxx_file.js');
		include('..\\..\\helpers\\helpers_xxx.js');
		include('..\\..\\helpers\\helpers_xxx_prototypes.js');
	} else {
		include('seekbar_xxx_helper_fallback.js');
		include(fb.ComponentPath + 'docs\\Codepages.js');  // Only used for UTF-8 codepage
	}
	include(fb.ComponentPath + 'docs\\Helpers.js'); // Only used to set the default colours
}