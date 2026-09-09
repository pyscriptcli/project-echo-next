import { NextRequest, NextResponse } from "next/server";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  WidthType, 
  AlignmentType, 
  BorderStyle,
  ShadingType
} from "docx";

function cleanField(val: any): string {
  if (!val) return "";
  const s = String(val).trim();
  const lower = s.toLowerCase();
  if (
    lower === "none" ||
    lower === "n/a" ||
    lower === "tbd" ||
    lower === "unassigned" ||
    lower === "null" ||
    lower === "undefined"
  ) {
    return "";
  }
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions } = await req.json();

    const clientName = cleanField(meeting_details?.client_name);
    const dateStr = cleanField(meeting_details?.date);
    const startT = cleanField(meeting_details?.start_time);
    const endT = cleanField(meeting_details?.end_time);
    let timeStr = "";
    if (startT && endT) {
      timeStr = `${startT} - ${endT}`;
    } else if (startT || endT) {
      timeStr = startT || endT;
    }
    const dateTimeStr = dateStr && timeStr ? `${dateStr} (${timeStr})` : (dateStr || timeStr);
    const locationStr = cleanField(meeting_details?.location);
    const typeStr = cleanField(meeting_details?.meeting_type);
    const teamAtt = cleanField(meeting_details?.team_attendees || meeting_details?.prime_attendees);
    const extAtt = cleanField(meeting_details?.external_attendees);

    // 1. Metadata Info Table
    const metaTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "Client / Project:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: clientName, size: 20 })] })],
            }),
            new TableCell({
              width: { size: 20, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "Meeting Type:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: typeStr, size: 20 })] })],
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "Date & Time:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: dateTimeStr, size: 20 })] })],
            }),
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "Venue / Location:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: locationStr, size: 20 })] })],
            }),
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "Team Attendees:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: teamAtt, size: 20 })] })],
            }),
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: "F4F1EC" },
              children: [new Paragraph({ children: [new TextRun({ text: "External Attendees:", bold: true, size: 20, color: "003366" })] })],
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: extAtt, size: 20 })] })],
            }),
          ]
        }),
      ]
    });

    // 2. Minutes Items Table
    const tableHeader = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF", size: 20 })] })],
          width: { size: 5, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Topic & Discussion Point", bold: true, color: "FFFFFF", size: 20 })] })],
          width: { size: 45, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Action Plan", bold: true, color: "FFFFFF", size: 20 })] })],
          width: { size: 25, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Target Date", bold: true, color: "FFFFFF", size: 20 })] })],
          width: { size: 12, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true, color: "FFFFFF", size: 20 })] })],
          width: { size: 13, type: WidthType.PERCENTAGE }
        }),
      ]
    });

    const tableRows: TableRow[] = [tableHeader];

    (items || []).forEach((item: any, idx: number) => {
      const isAlt = idx % 2 === 1;
      const rowFill = isAlt ? "FAF9F7" : "FFFFFF";

      const topicParagraphs = [
        new Paragraph({
          children: [new TextRun({ text: cleanField(item.topic_title), bold: true, color: "003366", size: 22 })]
        }),
        new Paragraph({
          children: [new TextRun({ text: cleanField(item.discussion_point), size: 19 })]
        })
      ];

      const quote = cleanField(item.evidence_quote);
      if (quote) {
        topicParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: "Evidence: ", bold: true, italics: true, size: 18, color: "888888" }),
            new TextRun({ text: `"${quote}"`, italics: true, size: 18, color: "666666" })
          ]
        }));
      }

      tableRows.push(new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), bold: true, color: "C9AB4C", size: 22 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: topicParagraphs
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ children: [new TextRun({ text: cleanField(item.action_plan), size: 19 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ children: [new TextRun({ text: cleanField(item.indicative_delivery_date), size: 19 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ children: [new TextRun({ text: cleanField(item.person_in_charge), size: 19 })] })]
          }),
        ]
      }));
    });

    // 3. Signature Approval Table
    const prepBy = cleanField(meeting_details?.prepared_by);
    const confBy = cleanField(meeting_details?.confirmed_by);
    const prepDes = cleanField(meeting_details?.prep_designation);
    const confDes = cleanField(meeting_details?.conf_designation);

    const signTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: "PREPARED BY:", bold: true, size: 20, color: "003366" })] }),
                new Paragraph({ text: "", spacing: { after: 400 } }),
                new Paragraph({ children: [new TextRun({ text: "____________________________________", color: "888888" })] }),
                new Paragraph({ children: [new TextRun({ text: prepBy, bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: prepDes, size: 18, color: "666666" })] }),
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: "CONFIRMED BY:", bold: true, size: 20, color: "003366" })] }),
                new Paragraph({ text: "", spacing: { after: 400 } }),
                new Paragraph({ children: [new TextRun({ text: "____________________________________", color: "888888" })] }),
                new Paragraph({ children: [new TextRun({ text: confBy, bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: confDes, size: 18, color: "666666" })] }),
              ]
            }),
          ]
        })
      ]
    });

    // Build the full Document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header (No PROJECT ECHO)
          new Paragraph({
            children: [
              new TextRun({ text: "Minutes of the Meeting", bold: true, italics: true, size: 32, color: "003366" }),
            ],
            spacing: { after: 200 }
          }),

          // Metadata Table
          metaTable,
          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Action Matrix Title
          new Paragraph({
            children: [
              new TextRun({ text: "DISCUSSION POINTS & ACTION MATRIX", bold: true, size: 22, color: "003366" }),
            ],
            spacing: { after: 150 }
          }),

          // MoM Table
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Other Discussions Block
          ...(cleanField(other_discussions) ? [
            new Paragraph({
              children: [
                new TextRun({ text: "OTHER DISCUSSIONS & ADMINISTRATIVE NOTES", bold: true, size: 22, color: "003366" }),
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: cleanField(other_discussions), size: 20 })
              ],
              spacing: { after: 400 }
            })
          ] : []),

          // Sign-off
          signTable,
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    const safeClient = clientName || "Meeting";
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="MoM_${safeClient.replace(/\s+/g, "_")}.docx"`,
      }
    });
  } catch (error: any) {
    console.error("Error generating executive Word doc:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
