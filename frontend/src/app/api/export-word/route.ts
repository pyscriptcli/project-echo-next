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

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions } = await req.json();

    const clientName = meeting_details?.client_name || "General Meeting";
    const dateStr = meeting_details?.date || "N/A";
    const timeStr = meeting_details?.start_time && meeting_details?.end_time 
      ? `${meeting_details.start_time} - ${meeting_details.end_time}`
      : "N/A";
    const locationStr = meeting_details?.location || "Headquarters";
    const typeStr = meeting_details?.meeting_type || "Internal";
    const teamAtt = meeting_details?.team_attendees || meeting_details?.prime_attendees || "Dave Policarpio";
    const extAtt = meeting_details?.external_attendees || "None";

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
              children: [new Paragraph({ children: [new TextRun({ text: `${dateStr} (${timeStr})`, size: 20 })] })],
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
          width: { size: 6, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "#", bold: true, color: "FFFFFF", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 44, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Topic & Discussion Point", bold: true, color: "FFFFFF", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Action Plan", bold: true, color: "FFFFFF", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 13, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Target Date", bold: true, color: "FFFFFF", size: 20 })] })]
        }),
        new TableCell({
          width: { size: 13, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: "003366" },
          children: [new Paragraph({ children: [new TextRun({ text: "Owner", bold: true, color: "FFFFFF", size: 20 })] })]
        }),
      ]
    });

    const tableRows = [tableHeader];

    (items || []).forEach((item: any, idx: number) => {
      const isAlt = idx % 2 === 1;
      const rowFill = isAlt ? "FAF9F7" : "FFFFFF";

      const topicParagraphs = [
        new Paragraph({
          children: [new TextRun({ text: item.topic_title || `Topic ${idx + 1}`, bold: true, color: "003366", size: 22 })]
        }),
        new Paragraph({
          children: [new TextRun({ text: item.discussion_point || "", size: 19 })]
        })
      ];

      if (item.evidence_quote) {
        topicParagraphs.push(new Paragraph({
          children: [
            new TextRun({ text: "Evidence: ", bold: true, italics: true, size: 18, color: "888888" }),
            new TextRun({ text: `"${item.evidence_quote}"`, italics: true, size: 18, color: "666666" })
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
            children: [new Paragraph({ children: [new TextRun({ text: item.action_plan || "None", size: 19 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ children: [new TextRun({ text: item.indicative_delivery_date || "TBD", size: 19 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: rowFill },
            children: [new Paragraph({ children: [new TextRun({ text: item.person_in_charge || "Unassigned", size: 19 })] })]
          }),
        ]
      }));
    });

    // 3. Signature Approval Table
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
                new Paragraph({ children: [new TextRun({ text: meeting_details?.prepared_by || "Dave Policarpio", bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: meeting_details?.prep_designation || "Executive Member", size: 18, color: "666666" })] }),
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: "CONFIRMED BY:", bold: true, size: 20, color: "003366" })] }),
                new Paragraph({ text: "", spacing: { after: 400 } }),
                new Paragraph({ children: [new TextRun({ text: "____________________________________", color: "888888" })] }),
                new Paragraph({ children: [new TextRun({ text: meeting_details?.confirmed_by || "Client Representative / Lead", bold: true, size: 20 })] }),
                new Paragraph({ children: [new TextRun({ text: meeting_details?.conf_designation || "Designation / Title", size: 18, color: "666666" })] }),
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
          // Header
          new Paragraph({
            children: [
              new TextRun({ text: "PROJECT ECHO", bold: true, size: 20, color: "C9AB4C" }),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Minutes of the Meeting", bold: true, italics: true, size: 36, color: "003366" }),
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
          new Paragraph({
            children: [
              new TextRun({ text: "OTHER DISCUSSIONS & ADMINISTRATIVE NOTES", bold: true, size: 22, color: "003366" }),
            ],
            spacing: { after: 150 }
          }),
          new Paragraph({
            children: [
              new TextRun({ text: other_discussions || "No additional administrative notes discussed.", size: 20 })
            ],
            spacing: { after: 400 }
          }),

          // Sign-off
          signTable
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="MoM_${(meeting_details.client_name || "Meeting").replace(/\s+/g, "_")}.docx"`,
      }
    });
  } catch (error: any) {
    console.error("Error generating executive Word doc:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
