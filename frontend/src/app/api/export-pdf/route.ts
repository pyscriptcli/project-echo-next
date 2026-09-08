import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions } = await req.json();

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Top Header Banner (Deep Charcoal Black #1A1A1A, smaller height)
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 22, "F");

    // Gold Accent Border (#C9AB4C)
    doc.setFillColor(201, 171, 76);
    doc.rect(0, 22, pageWidth, 1.5, "F");

    // Header Branding Text: "Minutes of the Meeting" then "PRIME PHILIPPINES"
    doc.setTextColor(255, 255, 255);
    doc.setFont("times", "bolditalic");
    doc.setFontSize(14);
    doc.text("Minutes of the Meeting", 14, 11.5);

    doc.setTextColor(201, 171, 76);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PROJECT ECHO", 14, 18);

    // Document Metadata Block
    doc.setTextColor(27, 29, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const startY = 28;
    const clientName = meeting_details?.client_name || "General Meeting";
    const dateStr = meeting_details?.date || "N/A";
    const timeStr = meeting_details?.start_time && meeting_details?.end_time 
      ? `${meeting_details.start_time} - ${meeting_details.end_time}`
      : "N/A";
    const locationStr = meeting_details?.location || "Headquarters";
    const typeStr = meeting_details?.meeting_type || "Internal";
    const teamAtt = meeting_details?.team_attendees || meeting_details?.prime_attendees || "Dave Policarpio";
    const extAtt = meeting_details?.external_attendees || "None";

    // Two-column metadata box
    doc.setFillColor(244, 241, 236);
    doc.rect(14, startY, pageWidth - 28, 28, "F");
    doc.setDrawColor(200, 205, 215);
    doc.rect(14, startY, pageWidth - 28, 28, "S");

    // Col 1
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PROJECT / CLIENT:", 18, startY + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(clientName, 55, startY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.text("DATE & TIME:", 18, startY + 13);
    doc.setFont("helvetica", "normal");
    doc.text(`${dateStr} (${timeStr})`, 55, startY + 13);

    doc.setFont("helvetica", "bold");
    doc.text("VENUE / LOCATION:", 18, startY + 19.5);
    doc.setFont("helvetica", "normal");
    doc.text(locationStr, 55, startY + 19.5);

    // Col 2
    const col2X = 110;
    doc.setFont("helvetica", "bold");
    doc.text("MEETING TYPE:", col2X, startY + 6.5);
    doc.setFont("helvetica", "normal");
    doc.text(typeStr, col2X + 30, startY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.text("TEAM ATTENDEES:", col2X, startY + 13);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(teamAtt, 50), col2X + 35, startY + 13);

    doc.setFont("helvetica", "bold");
    doc.text("EXTERNAL ATTENDEES:", col2X, startY + 20.5);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(extAtt, 45), col2X + 43, startY + 20.5);

    // Short Meeting Summary Paragraph (Synthesized strictly from discussion points, NOT transcript)
    let summaryText = "";
    if (items && items.length > 0) {
      const pointSummaries = items
        .map((it: any) => {
          const disc = it.discussion_point?.trim() || "";
          if (!disc) return "";
          // Take the primary sentence or clean point
          const firstSentence = disc.split(/\.\s+/)[0];
          return firstSentence.endsWith(".") ? firstSentence : `${firstSentence}.`;
        })
        .filter(Boolean);

      if (pointSummaries.length > 0) {
        summaryText = pointSummaries.slice(0, 3).join(" ");
        if (!summaryText.endsWith(".")) summaryText += ".";
      }
    }
    if (!summaryText) {
      summaryText = "The meeting covered key discussion points, strategic alignment, and actionable next steps outlined below.";
    }

    const summaryStartY = startY + 32;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 36);
    const summaryBoxHeight = Math.max(15, (summaryLines.length * 4) + 9);

    doc.setFillColor(250, 249, 247);
    doc.rect(14, summaryStartY, pageWidth - 28, summaryBoxHeight, "F");
    doc.setDrawColor(220, 225, 230);
    doc.rect(14, summaryStartY, pageWidth - 28, summaryBoxHeight, "S");

    // Gold accent on left edge
    doc.setFillColor(201, 171, 76);
    doc.rect(14, summaryStartY, 2, summaryBoxHeight, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 51, 102);
    doc.text("EXECUTIVE SUMMARY", 19, summaryStartY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);
    doc.text(summaryLines, 19, summaryStartY + 9.5);

    // Table Data
    const tableData = (items || []).map((item: any, index: number) => {
      let topicCell = `${item.topic_title || `Topic ${index + 1}`}\n\n${item.discussion_point || ""}`;
      if (item.evidence_quote) {
        topicCell += `\n\nEvidence: "${item.evidence_quote}"`;
      }
      return [
        String(index + 1),
        topicCell,
        item.action_plan || "None",
        item.indicative_delivery_date || "TBD",
        item.person_in_charge || "Unassigned"
      ];
    });

    const tableStartY = summaryStartY + summaryBoxHeight + 5;

    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Topic & Discussion Point", "Action Plan", "Target Date", "Owner"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "left"
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center", fontStyle: "bold", textColor: [201, 171, 76] },
        1: { cellWidth: 80, fontSize: 8.5 },
        2: { cellWidth: 42, fontSize: 8.5 },
        3: { cellWidth: 24, fontSize: 8.5 },
        4: { cellWidth: 26, fontSize: 8.5 }
      },
      styles: {
        cellPadding: 3.5,
        overflow: "linebreak",
        lineColor: [220, 225, 230],
        lineWidth: 0.2
      },
      alternateRowStyles: {
        fillColor: [250, 249, 247]
      }
    });

    // @ts-ignore
    let currentY = (doc as any).lastAutoTable?.finalY || (startY + 36);
    currentY += 8;

    // Check if new page needed for Other Discussions
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    const otherDiscussionsText = other_discussions || "";
    if (otherDiscussionsText && otherDiscussionsText.trim().length > 0) {
      doc.setFillColor(0, 51, 102);
      doc.rect(14, currentY, 3, 7, "F");

      doc.setFont("times", "bolditalic");
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text("Other Discussions & Administrative Notes", 20, currentY + 5.5);

      currentY += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(50, 50, 50);
      const splitOther = doc.splitTextToSize(otherDiscussionsText, pageWidth - 28);
      doc.text(splitOther, 14, currentY);
      currentY += (splitOther.length * 4.5) + 8;
    }

    // Signatures / Approval Block
    if (currentY > 240) {
      doc.addPage();
      currentY = 30;
    } else {
      currentY += 8;
    }

    doc.setDrawColor(201, 171, 76);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(0, 51, 102);
    doc.text("PREPARED BY:", 18, currentY);
    doc.text("CONFIRMED BY:", 110, currentY);

    currentY += 12;
    doc.setDrawColor(180, 180, 180);
    doc.line(18, currentY, 80, currentY);
    doc.line(110, currentY, 175, currentY);

    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(27, 29, 30);
    doc.text(meeting_details?.prepared_by || "Dave Policarpio", 18, currentY);
    doc.text(meeting_details?.confirmed_by || "Client Representative / Lead", 110, currentY);

    currentY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text(meeting_details?.prep_designation || "Executive Member", 18, currentY);
    doc.text(meeting_details?.conf_designation || "Designation / Title", 110, currentY);

    const buffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="MoM_${(meeting_details.client_name || "Meeting").replace(/\s+/g, "_")}.pdf"`,
      }
    });
  } catch (error: any) {
    console.error("Error generating executive PDF:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
