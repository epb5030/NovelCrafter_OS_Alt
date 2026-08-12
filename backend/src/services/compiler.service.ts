const { ZipArchive } = require('archiver');
import { Response } from 'express';

export interface CompilerChapter {
  title: string;
  type: string;
  scenes: {
    title: string;
    content: string;
    summary?: string;
  }[];
}

export interface CompilerProject {
  id: number;
  title: string;
  summary?: string;
  genre?: string;
}

export interface CompilerAuthor {
  pen_name: string;
  email?: string;
  bio?: string;
}

export interface EpubOptions {
  theme?: 'classic' | 'modern' | 'vintage';
  publisher?: string;
  isbn?: string;
  language?: string;
  includeToc?: boolean;
  dedication?: string;
  copyrightNotice?: string;
  acknowledgments?: string;
}

export interface DocxOptions {
  format?: 'standard_manuscript' | 'reading_draft'; // standard = double spaced Times New Roman Shunn format
  includeTitlePage?: boolean;
  fontFamily?: string;
  dedication?: string;
  copyrightNotice?: string;
  acknowledgments?: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class CompilerService {
  
  /**
   * Compiles and streams a valid EPUB 3 e-book file with optional front-matter
   */
  static compileEpub(
    res: Response,
    project: CompilerProject,
    author: CompilerAuthor,
    chapters: CompilerChapter[],
    options: EpubOptions = {}
  ) {
    const slug = (project.title || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/epub+zip');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.epub"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);

    // 1. mimetype (MUST be first, uncompressed)
    archive.append('application/epub+zip', { name: 'mimetype', store: true });

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    archive.append(containerXml, { name: 'META-INF/container.xml' });

    // CSS Styling based on theme
    let fontCss = 'font-family: "Georgia", "Garamond", "Times New Roman", serif; line-height: 1.6;';
    if (options.theme === 'modern') {
      fontCss = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.65;';
    } else if (options.theme === 'vintage') {
      fontCss = 'font-family: "Courier New", Courier, monospace; line-height: 1.7;';
    }

    const stylesheet = `body {
  margin: 5%;
  ${fontCss}
  color: #1a1a1a;
}
h1, h2, h3 {
  text-align: center;
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-weight: 700;
}
h1 { font-size: 1.8em; }
h2 { font-size: 1.4em; }
p {
  text-indent: 1.5em;
  margin-top: 0;
  margin-bottom: 0;
  text-align: justify;
}
p.first-p {
  text-indent: 0;
}
.scene-break {
  text-align: center;
  margin: 1.5em 0;
  text-indent: 0;
  font-weight: bold;
}
.title-page {
  text-align: center;
  padding-top: 25%;
}
.title-page h1 { font-size: 2.4em; margin-bottom: 0.2em; }
.title-page .author { font-size: 1.3em; color: #444; margin-top: 1.5em; }
.title-page .genre { font-size: 0.9em; color: #777; margin-top: 0.5em; text-transform: uppercase; letter-spacing: 1px; }
.front-matter {
  padding-top: 20%;
  text-align: center;
  font-style: italic;
  line-height: 1.8;
}
.copyright-page {
  padding-top: 20%;
  font-size: 0.85em;
  line-height: 1.6;
  text-align: center;
  color: #444;
}
`;
    archive.append(stylesheet, { name: 'OEBPS/style.css' });

    // 3. Title Page XHTML
    const titlePageXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>${escapeXml(project.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-page">
    <h1>${escapeXml(project.title)}</h1>
    <div class="author">By ${escapeXml(author.pen_name || 'Anonymous')}</div>
    ${project.genre ? `<div class="genre">${escapeXml(project.genre)}</div>` : ''}
    ${options.publisher ? `<div style="margin-top: 3em; font-size: 0.8em; color: #888;">Published by ${escapeXml(options.publisher)}</div>` : ''}
  </div>
</body>
</html>`;
    archive.append(titlePageXhtml, { name: 'OEBPS/titlepage.xhtml' });

    const manifestItems: string[] = [
      '<item id="style" href="style.css" media-type="text/css"/>',
      '<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>',
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
    ];
    const spineItems: string[] = [
      '<itemref idref="titlepage"/>'
    ];
    const tocNavItems: string[] = [
      '<li><a href="titlepage.xhtml">Title Page</a></li>'
    ];

    // Optional Front-Matter: Dedication
    if (options.dedication && options.dedication.trim()) {
      const dedicationXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>Dedication</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="front-matter">
    <p class="first-p">${escapeXml(options.dedication.trim())}</p>
  </div>
</body>
</html>`;
      archive.append(dedicationXhtml, { name: 'OEBPS/dedication.xhtml' });
      manifestItems.push('<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>');
      spineItems.push('<itemref idref="dedication"/>');
      tocNavItems.push('<li><a href="dedication.xhtml">Dedication</a></li>');
    }

    // Optional Front-Matter: Copyright Page
    const copyrightNotice = options.copyrightNotice || `Copyright © ${new Date().getFullYear()} by ${author.pen_name || 'Author'}.\nAll rights reserved.`;
    const copyrightXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>Copyright</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="copyright-page">
    ${copyrightNotice.split('\n').map(l => `<p class="first-p">${escapeXml(l.trim())}</p>`).join('\n')}
    ${options.isbn ? `<p class="first-p" style="margin-top: 1.5em;">ISBN: ${escapeXml(options.isbn)}</p>` : ''}
    ${options.publisher ? `<p class="first-p">Published by ${escapeXml(options.publisher)}</p>` : ''}
  </div>
</body>
</html>`;
    archive.append(copyrightXhtml, { name: 'OEBPS/copyright.xhtml' });
    manifestItems.push('<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>');
    spineItems.push('<itemref idref="copyright"/>');

    // 4. Chapter XHTML Files
    let chapterIndex = 1;
    for (const chap of chapters) {
      const chapId = `chapter_${chapterIndex}`;
      const chapFileName = `${chapId}.xhtml`;

      let chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>${escapeXml(chap.title)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>${escapeXml(chap.title)}</h1>
`;

      let isFirstParagraphInScene = true;
      chap.scenes.forEach((scene, sIdx) => {
        if (sIdx > 0) {
          chapterHtml += `  <div class="scene-break">* * *</div>\n`;
          isFirstParagraphInScene = true;
        }

        const paragraphs = (scene.content || '').split(/\n\n+/).filter(p => p.trim());
        if (paragraphs.length === 0) {
          chapterHtml += `  <p class="first-p"><em>[Scene draft in progress]</em></p>\n`;
        } else {
          paragraphs.forEach((pText) => {
            const cleanP = escapeXml(pText.trim());
            if (isFirstParagraphInScene) {
              chapterHtml += `  <p class="first-p">${cleanP}</p>\n`;
              isFirstParagraphInScene = false;
            } else {
              chapterHtml += `  <p>${cleanP}</p>\n`;
            }
          });
        }
      });

      chapterHtml += `</body>\n</html>`;

      archive.append(chapterHtml, { name: `OEBPS/${chapFileName}` });
      manifestItems.push(`<item id="${chapId}" href="${chapFileName}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${chapId}"/>`);
      tocNavItems.push(`<li><a href="${chapFileName}">${escapeXml(chap.title)}</a></li>`);
      chapterIndex++;
    }

    // Optional Back-Matter: Acknowledgments
    if (options.acknowledgments && options.acknowledgments.trim()) {
      const ackXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>Acknowledgments</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <h1>Acknowledgments</h1>
  ${options.acknowledgments.split(/\n\n+/).map(p => `<p class="first-p">${escapeXml(p.trim())}</p>`).join('\n')}
</body>
</html>`;
      archive.append(ackXhtml, { name: 'OEBPS/acknowledgments.xhtml' });
      manifestItems.push('<item id="acknowledgments" href="acknowledgments.xhtml" media-type="application/xhtml+xml"/>');
      spineItems.push('<itemref idref="acknowledgments"/>');
      tocNavItems.push('<li><a href="acknowledgments.xhtml">Acknowledgments</a></li>');
    }

    // 5. Navigation Document (nav.xhtml)
    const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${options.language || 'en'}">
<head>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${tocNavItems.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
    archive.append(navXhtml, { name: 'OEBPS/nav.xhtml' });

    // 6. NCX Table of Contents (for backwards EPUB 2 e-readers)
    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:opencrafter-${project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(project.title)}</text></docTitle>
  <docAuthor><text>${escapeXml(author.pen_name)}</text></docAuthor>
  <navMap>
    <navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Title Page</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>
    ${chapters.map((c, i) => `
    <navPoint id="navpoint-${i + 2}" playOrder="${i + 2}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="chapter_${i + 1}.xhtml"/>
    </navPoint>`).join('')}
  </navMap>
</ncx>`;
    archive.append(tocNcx, { name: 'OEBPS/toc.ncx' });
    manifestItems.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');

    // 7. Package OPF (content.opf)
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${options.language || 'en'}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:opencrafter-${project.id}</dc:identifier>
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>${escapeXml(author.pen_name)}</dc:creator>
    <dc:language>${options.language || 'en'}</dc:language>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    ${project.summary ? `<dc:description>${escapeXml(project.summary)}</dc:description>` : ''}
    ${options.publisher ? `<dc:publisher>${escapeXml(options.publisher)}</dc:publisher>` : ''}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    archive.append(contentOpf, { name: 'OEBPS/content.opf' });

    archive.finalize();
  }

  /**
   * Compiles and streams a valid OpenXML Microsoft Word (.docx) manuscript
   */
  static compileDocx(
    res: Response,
    project: CompilerProject,
    author: CompilerAuthor,
    chapters: CompilerChapter[],
    options: DocxOptions = {}
  ) {
    const slug = (project.title || 'manuscript').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.docx"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.pipe(res);

    // Compute Word Count stats across all scenes
    let totalWords = 0;
    chapters.forEach(chap => {
      chap.scenes.forEach(scene => {
        const words = (scene.content || '').trim() ? scene.content.trim().split(/\s+/).length : 0;
        totalWords += words;
      });
    });

    const isStandard = options.format !== 'reading_draft';
    const lineSpacing = isStandard ? 'line="480" lineRule="auto"' : 'line="280" lineRule="auto"'; // 480 = double space, 280 = 1.15
    const fontFamily = isStandard ? 'Times New Roman' : (options.fontFamily || 'Calibri');

    // 1. [Content_Types].xml
    const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
    archive.append(contentTypes, { name: '[Content_Types].xml' });

    // 2. _rels/.rels
    const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
    archive.append(rootRels, { name: '_rels/.rels' });

    // 3. word/_rels/document.xml.rels
    const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
    archive.append(docRels, { name: 'word/_rels/document.xml.rels' });

    // 4. word/styles.xml
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rFonts w:ascii="${fontFamily}" w:hAnsi="${fontFamily}" w:cs="${fontFamily}"/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing ${lineSpacing} w:after="0"/>
      <w:ind w:firstLine="720"/>
    </w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:before="720" w:after="360" ${lineSpacing}/>
      <w:jc w:val="center"/>
      <w:ind w:firstLine="0"/>
    </w:pPr>
    <w:rPr>
      <w:b/>
      <w:sz w:val="32"/>
    </w:rPr>
  </w:style>
</w:styles>`;
    archive.append(stylesXml, { name: 'word/styles.xml' });

    // 5. word/document.xml
    let docBody = '';

    // Standard Shunn Manuscript Title Page Header
    if (options.includeTitlePage !== false) {
      docBody += `
      <w:p>
        <w:pPr><w:ind w:firstLine="0"/><w:spacing ${lineSpacing}/></w:pPr>
        <w:r><w:t>${escapeXml(author.pen_name || 'Author Name')}</w:t></w:r>
      </w:p>
      ${author.email ? `
      <w:p>
        <w:pPr><w:ind w:firstLine="0"/><w:spacing ${lineSpacing}/></w:pPr>
        <w:r><w:t>${escapeXml(author.email)}</w:t></w:r>
      </w:p>` : ''}
      <w:p>
        <w:pPr><w:jc w:val="right"/><w:ind w:firstLine="0"/><w:spacing ${lineSpacing}/></w:pPr>
        <w:r><w:t>Approx. ${totalWords.toLocaleString()} words</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:spacing w:before="2880"/><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr>
        <w:r><w:rPr><w:b/><w:sz w:val="40"/></w:rPr><w:t>${escapeXml(project.title.toUpperCase())}</w:t></w:r>
      </w:p>
      <w:p><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing ${lineSpacing}/></w:pPr>
        <w:r><w:t>by ${escapeXml(author.pen_name || 'Author')}</w:t></w:r>
      </w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
`;
    }

    // Optional Front-Matter: Dedication in DOCX
    if (options.dedication && options.dedication.trim()) {
      docBody += `
      <w:p>
        <w:pPr><w:spacing w:before="2880" ${lineSpacing}/><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr>
        <w:r><w:rPr><w:i/></w:rPr><w:t>${escapeXml(options.dedication.trim())}</w:t></w:r>
      </w:p>
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
`;
    }

    // Chapters and Scenes
    chapters.forEach((chap, cIdx) => {
      // Page break before subsequent chapters
      if (cIdx > 0 || options.includeTitlePage === false) {
        if (cIdx > 0) {
          docBody += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>\n`;
        }
      }

      // Chapter Heading
      docBody += `
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>${escapeXml(chap.title)}</w:t></w:r>
      </w:p>\n`;

      chap.scenes.forEach((scene, sIdx) => {
        if (sIdx > 0) {
          // Standard manuscript scene break
          docBody += `
          <w:p>
            <w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing ${lineSpacing}/></w:pPr>
            <w:r><w:t>#</w:t></w:r>
          </w:p>\n`;
        }

        const paragraphs = (scene.content || '').split(/\n\n+/).filter(p => p.trim());
        paragraphs.forEach(pText => {
          docBody += `
          <w:p>
            <w:pPr><w:pStyle w:val="Normal"/></w:pPr>
            <w:r><w:t xml:space="preserve">${escapeXml(pText.trim())}</w:t></w:r>
          </w:p>\n`;
        });
      });
    });

    // Optional Back-Matter: Acknowledgments in DOCX
    if (options.acknowledgments && options.acknowledgments.trim()) {
      docBody += `
      <w:p><w:r><w:br w:type="page"/></w:r></w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>Acknowledgments</w:t></w:r>
      </w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Normal"/></w:pPr>
        <w:r><w:t xml:space="preserve">${escapeXml(options.acknowledgments.trim())}</w:t></w:r>
      </w:p>
`;
    }

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${docBody}
    <w:sectPr>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
    archive.append(documentXml, { name: 'word/document.xml' });

    archive.finalize();
  }
}
