import { Document, Packer, Paragraph, ImageRun, TextRun, Table, TableCell, TableRow, WidthType } from 'docx';
import PptxGenJS from 'pptxgenjs';
import { resolveSignedPhotoUrl } from '@/lib/signedPhotoUrl';

interface StagiaireWithPhoto {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  photo_url: string | null;
}

export const useTrombinoscopeExport = () => {
  const exportToDOCX = async (stagiaires: StagiaireWithPhoto[], className: string) => {
    try {
      const rows = [];
      
      // Create rows with 3 stagiaires per row
      for (let i = 0; i < stagiaires.length; i += 3) {
        const rowStagiaires = stagiaires.slice(i, i + 3);
        const cells = [];
        
        for (const stagiaire of rowStagiaires) {
          const cellContent = [];
          
          // Add photo if available
          if (stagiaire.photo_url) {
            try {
              const signedUrl = await resolveSignedPhotoUrl(stagiaire.photo_url, 'stagiaire-photos');
              if (!signedUrl) throw new Error('Cannot resolve signed URL');
              const response = await fetch(signedUrl);
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              
              // Determine image type from blob
              const imageType = blob.type.includes('png') ? 'png' : 'jpg';
              
              cellContent.push(
                new Paragraph({
                  children: [
                    new ImageRun({
                      type: imageType,
                      data: new Uint8Array(arrayBuffer),
                      transformation: {
                        width: 150,
                        height: 150,
                      },
                    }),
                  ],
                  spacing: { after: 200 },
                })
              );
            } catch (error) {
              console.error('Error loading image:', error);
            }
          }
          
          // Add name
          cellContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${stagiaire.prenom} ${stagiaire.nom}`,
                  bold: true,
                }),
              ],
              spacing: { after: 100 },
            })
          );
          
          // Add email
          cellContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: stagiaire.email,
                  size: 18,
                }),
              ],
            })
          );
          
          cells.push(
            new TableCell({
              children: cellContent,
              width: { size: 33, type: WidthType.PERCENTAGE },
            })
          );
        }
        
        // Fill empty cells if row is not complete
        while (cells.length < 3) {
          cells.push(new TableCell({ children: [new Paragraph('')] }));
        }
        
        rows.push(new TableRow({ children: cells }));
      }
      
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Trombinoscope - ${className}`,
                    bold: true,
                    size: 32,
                  }),
                ],
                spacing: { after: 400 },
              }),
              new Table({
                rows,
                width: { size: 100, type: WidthType.PERCENTAGE },
              }),
            ],
          },
        ],
      });
      
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `trombinoscope_${className.replace(/\s/g, '_')}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exporting to DOCX:', error);
      return false;
    }
  };
  
  const exportToPPTX = async (stagiaires: StagiaireWithPhoto[], className: string) => {
    try {
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      
      // Title slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(`Trombinoscope - ${className}`, {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 1,
        fontSize: 44,
        bold: true,
        align: 'center',
      });
      
      // Create slides with 6 stagiaires per slide (2 rows x 3 columns)
      for (let i = 0; i < stagiaires.length; i += 6) {
        const slide = pptx.addSlide();
        const slideStagiaires = stagiaires.slice(i, i + 6);
        
        for (let j = 0; j < slideStagiaires.length; j++) {
          const stagiaire = slideStagiaires[j];
          const col = j % 3;
          const row = Math.floor(j / 3);
          
          const x = 0.5 + col * 3.3;
          const y = 1 + row * 3;
          
          // Add photo if available
          if (stagiaire.photo_url) {
            try {
              const signedUrl = await resolveSignedPhotoUrl(stagiaire.photo_url, 'stagiaire-photos');
              if (signedUrl) {
                slide.addImage({
                  path: signedUrl,
                  x: x,
                  y: y,
                  w: 2,
                  h: 2,
                });
              }
            } catch (error) {
              console.error('Error adding image to slide:', error);
            }
          }
          
          // Add name
          slide.addText(`${stagiaire.prenom} ${stagiaire.nom}`, {
            x: x,
            y: y + 2.1,
            w: 2,
            h: 0.3,
            fontSize: 14,
            bold: true,
            align: 'center',
          });
          
          // Add email
          slide.addText(stagiaire.email, {
            x: x,
            y: y + 2.4,
            w: 2,
            h: 0.3,
            fontSize: 10,
            align: 'center',
          });
        }
      }
      
      await pptx.writeFile({ fileName: `trombinoscope_${className.replace(/\s/g, '_')}.pptx` });
      return true;
    } catch (error) {
      console.error('Error exporting to PPTX:', error);
      return false;
    }
  };
  
  return { exportToDOCX, exportToPPTX };
};
