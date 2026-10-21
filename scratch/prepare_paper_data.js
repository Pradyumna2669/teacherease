const fs = require('fs');

// Create the clean SVG for बाग concept diagram
const bagSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 650 250" width="100%" height="100%">
  <!-- Connecting Lines from 'बाग' (cx: 325, cy: 190) -->
  <line x1="325" y1="160" x2="325" y2="88" stroke="#333333" stroke-width="2"/>
  
  <!-- Left radiating lines -->
  <line x1="295" y1="172" x2="190" y2="52" stroke="#333333" stroke-width="2"/>
  <line x1="275" y1="185" x2="180" y2="128" stroke="#333333" stroke-width="2"/>
  <line x1="272" y1="196" x2="190" y2="204" stroke="#333333" stroke-width="2"/>

  <!-- Right radiating lines -->
  <line x1="355" y1="172" x2="460" y2="52" stroke="#333333" stroke-width="2"/>
  <line x1="375" y1="185" x2="470" y2="128" stroke="#333333" stroke-width="2"/>
  <line x1="378" y1="196" x2="460" y2="204" stroke="#333333" stroke-width="2"/>

  <!-- Top Oval: प्रसन्नता (Example given) -->
  <g transform="translate(325, 60)">
    <ellipse cx="0" cy="0" rx="68" ry="26" fill="#f8fafc" stroke="#1e293b" stroke-width="2"/>
    <text x="0" y="7" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="19" font-weight="bold" fill="#0f172a" text-anchor="middle">प्रसन्नता</text>
  </g>

  <!-- Center Root Oval: बाग -->
  <g transform="translate(325, 190)">
    <ellipse cx="0" cy="0" rx="60" ry="28" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.4"/>
    <text x="0" y="8" font-family="'Noto Sans Devanagari', 'Mangal', 'Segoe UI', sans-serif" font-size="24" font-weight="bold" fill="#000000" text-anchor="middle">बाग</text>
  </g>

  <!-- Blank Boxes for students to fill (6 boxes) -->
  <rect x="45" y="28" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
  <rect x="35" y="105" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
  <rect x="45" y="182" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>

  <rect x="460" y="28" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
  <rect x="470" y="105" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
  <rect x="460" y="182" width="145" height="46" rx="8" fill="#ffffff" stroke="#1e293b" stroke-width="2"/>
</svg>`;

const bagBase64 = `data:image/svg+xml;base64,${Buffer.from(bagSvg).toString('base64')}`;

const updatedPaper = {
  id: "61463c3b-167c-4f49-8efd-e659287bab26",
  user_id: "56bbd382-cdd0-488a-ac09-20cd629643ca",
  title: "Marathi • Summative Assessment-1",
  subject: "Marathi",
  class_name: "Class - 6th std",
  settings: {
    margin: "narrow",
    density: "compact",
    logoUrl: "",
    section: "",
    subject: "Marathi",
    fontSize: 13,
    language: "marathi",
    answerKey: false,
    className: "Class - 6th std",
    lineStyle: "single",
    fontFamily: "serif",
    headerRows: [
      ["name", "rollNo", "marks"],
      ["subject", "className", "date"]
    ],
    schoolName: "SDF Primary English School",
    totalMarks: 40,
    headerStyle: "boxed",
    pageColumns: 1,
    timeAllowed: "2 hr",
    academicYear: "2026-27",
    instructions: [],
    mcqOptionBox: false,
    schoolSubtitle: "",
    assessmentTitle: "Summative Assessment",
    showAnswerSpace: true
  },
  questions: [
    // 0: Comprehension
    {
      id: "q1_comprehension",
      type: "comprehension",
      title: "प्र. १ ला पुढील उतारा वाचून दिलेल्या सूचनांनुसार कृती करा :",
      marks: 4,
      passageTitle: "उतारा",
      passage: "आई, मी इथे खूप मजा करत आहे. हिरवेगार डोंगर, झुळझुळ वाहणारी नदी, पिकांनी बहरलेलं शेत, डोलणाऱ्या गवतफुलांचे माळरान हे असं निसर्गाचं सुंदर रूप पाहायला गावालाच यायला हवं. आता दरवर्षी सुट्टीत मी आजीच्या गावाला जायचं ठरवलंय. आजीच्या हातची भाजीभाकरी एवढी चविष्ट लागते, की मला पिझ्झा, बर्गरची मुळीच आठवण येत नाही. काल मी आजोबांबरोबर देवळात कीर्तन ऐकायला गेले होते. कथा, काव्य, नाट्य यांचा सुंदर मिलाप म्हणजे कीर्तन! असे आजोबा म्हणाले, ते कीर्तन ऐकल्यावर मला समजलं. कीर्तनाचा कार्यक्रम एवढा रंगला, की दोन तास कसे गेले ते समजलं नाही. सगळे जण कीर्तनात दंग होऊन गेले होते.",
      items: [
        {
          id: "q1_item_1",
          lines: 0,
          content: "चौकटी पूर्ण करा :\nअ) ओवी आजोबांबरोबर गावात गेलेली ते ठिकाण  [ ___________________________ ]\nब) कथा, काव्य, नाट्य यांचा सुंदर मिलाप म्हणजे  [ ___________________________ ]",
          answer: "अ) देवळात (कीर्तन ऐकायला)\nब) कीर्तन"
        },
        {
          id: "q1_item_2",
          lines: 0,
          content: "कोण कोणास म्हणाले ? ते लिहा :\n\"मी इथे खूप मजा करत आहे.\" - ____________________________________",
          answer: "ओवी आईला म्हणाली."
        },
        {
          id: "q1_item_3",
          lines: 0,
          content: "कारण लिहा :\nदेवळात दोन तास कसे गेले ते ओवीला समजले नाही कारण - ____________________________________",
          answer: "कीर्तनाचा कार्यक्रम एवढा रंगला, की सगळे जण कीर्तनात दंग होऊन गेले होते."
        }
      ],
      columnsPerRow: 1
    },

    // 1: स्वमत
    {
      id: "q1_swamat",
      type: "short-answer",
      title: "स्वमत :",
      marks: 3,
      items: [
        {
          id: "q1_swamat_1",
          lines: 3,
          content: "ओवीने दरवर्षी सुट्टीत गावाला यायचे का ठरवले असावे ते तुमच्या शब्दात लिहा.",
          answer: "ओवीला गावातील हिरवेगार डोंगर, वाहणारी नदी, शेते व निसर्गाचे सुंदर रूप खूप आवडले. आजीच्या हातची चविष्ट भाजीभाकरी आणि देवळातील कीर्तनाचा आनंद तिला मिळाला, म्हणून तिने दरवर्षी सुट्टीत गावाला यायचे ठरवले."
        }
      ],
      columnsPerRow: 1
    },

    // 2: आजीने मुलाला दिलेला खाऊ / लाडाने म्हणते
    {
      id: "q1_aaji_boxes",
      type: "short-answer",
      title: "चौकटी पूर्ण करा :",
      marks: 2,
      items: [
        {
          id: "q1_aaji_1",
          lines: 0,
          content: "आजीने मुलाला दिलेला खाऊ  ➞  [ ________________________________ ]",
          answer: "धपाटे / लाडू"
        },
        {
          id: "q1_aaji_2",
          lines: 0,
          content: "आजी मुलाला लाडाने म्हणते  ➞  [ ________________________________ ]",
          answer: "लखोबा / राजा"
        }
      ],
      columnsPerRow: 1
    },

    // 3: विरामचिन्हे ओळखा आणि लिहा
    {
      id: "q1_viramchinhe",
      type: "short-answer",
      title: "विरामचिन्हे ओळखा आणि लिहा :",
      marks: 1,
      columnsPerRow: 3,
      items: [
        {
          id: "q1_vc_1",
          lines: 0,
          content: "[  ,  ]   _________________",
          answer: "स्वल्पविराम"
        },
        {
          id: "q1_vc_2",
          lines: 0,
          content: "[  !  ]   _________________",
          answer: "उद्गारचिन्ह"
        },
        {
          id: "q1_vc_3",
          lines: 0,
          content: "[  ?  ]   _________________",
          answer: "प्रश्नचिन्ह"
        }
      ]
    },

    // 4: प्र. २ (अ) खालील प्रश्नांची उत्तरे लिहा
    {
      id: "q2_a_answers",
      type: "short-answer",
      title: "प्र. २ (अ) खालील प्रश्नांची उत्तरे लिहा :",
      marks: 8,
      columnsPerRow: 1,
      items: [
        {
          id: "q2_a_1",
          lines: 1,
          content: "ईशाच्या घरी काय कार्यक्रम होता ?",
          answer: "ईशाच्या वाढदिवसाचा कार्यक्रम होता."
        },
        {
          id: "q2_a_2",
          lines: 1,
          content: "आम्ही महाराष्ट्रकन्या या कवितेत कोणत्या शिखराचे नाव आले आहे ?",
          answer: "कळसूबाई शिखराचे नाव आले आहे."
        },
        {
          id: "q2_a_3",
          lines: 1,
          content: "पूर्वी लोक कोणाची उत्सुकतेने वाट पाहायचे ?",
          answer: "पूर्वी लोक पोस्टमनची (टपालाची) उत्सुकतेने वाट पाहायचे."
        },
        {
          id: "q2_a_4",
          lines: 1,
          content: "ईशाने बाल्कनीत झाडे लावण्याचे का ठरवले ?",
          answer: "बाल्कनीत चिमण्या, पक्षी यावेत म्हणून ईशाने झाडे लावण्याचे ठरवले."
        },
        {
          id: "q2_a_5",
          lines: 1,
          content: "पावसाळ्यात वाहणारे पाणी आपल्याबरोबर काय घेऊन जाते ?",
          answer: "पावसाळ्यात वाहणारे पाणी आपल्याबरोबर मातीचा सुपीक थर वाहून घेऊन जाते."
        },
        {
          id: "q2_a_6",
          lines: 1,
          content: "यशला आजोबांचा डबा भारी का वाटला ?",
          answer: "आजोबांच्या डब्यात प्रेम आणि आपुलकीची शिदोरी होती, म्हणून यशला आजोबांचा डबा भारी वाटला."
        },
        {
          id: "q2_a_7",
          lines: 1,
          content: "सहलीसाठी माथेरान कोणाला जवळ आहे ?",
          answer: "सहलीसाठी माथेरान मुंबई आणि पुणेकरांना जवळ आहे."
        },
        {
          id: "q2_a_8",
          lines: 1,
          content: "कोणत्याही प्रकारच्या वाहनांना प्रवेश नसणारे थंड हवेचे ठिकाण कोणते ?",
          answer: "माथेरान हे कोणत्याही प्रकारच्या वाहनांना प्रवेश नसणारे थंड हवेचे ठिकाण आहे."
        },
        {
          id: "q2_a_9",
          lines: 1,
          content: "आंबेवाडीला पोहोचण्यासाठी पार करावे लागणारे धरण कोणते ?",
          answer: "भांडारदरा धरण."
        },
        {
          id: "q2_a_10",
          lines: 1,
          content: "पूर्वी चिमण्यांना राहण्यासाठी भरपूर जागा का असायची ?",
          answer: "पूर्वी कौलारू घरे आणि छपरांच्या फटी असायच्या, त्यामुळे चिमण्यांना राहण्यासाठी भरपूर जागा असायची."
        }
      ]
    },

    // 5: ब) खालील ओळींचा सरळ अर्थ लिहा
    {
      id: "q2_b_arth",
      type: "short-answer",
      title: "ब) खालील ओळींचा सरळ अर्थ लिहा :",
      marks: 2,
      columnsPerRow: 1,
      items: [
        {
          id: "q2_b_1",
          lines: 3,
          content: "\"रंगीत रंगीत फुलफुलातून हास्य उमलते तेव्हा,\nघमघमणारा सुवास अपुल्या उरात भरूनी घ्यावा\"",
          answer: "विविध रंगांच्या सुंदर फुलांमधून जेव्हा हास्य उमलते, तेव्हा त्या फुलांचा सुगंध आणि आनंद आपण मनापासून आपल्या हृदयात साठवून घेतला पाहिजे."
        }
      ]
    },

    // 6: क) बाग या शब्दाशी संबंधित शब्द
    {
      id: "q2_c_bag",
      type: "short-answer",
      title: "क) 'बाग' या शब्दाशी संबंधित शब्द रिकाम्या चौकटीमध्ये लिहून पूर्ण करा :",
      marks: 2,
      columnsPerRow: 1,
      images: [bagBase64],
      imageColumns: 1,
      imageAlign: "center",
      imageMaxHeight: 200,
      imageNumbers: false,
      items: [],
      answerNote: "बाग या शब्दाशी संबंधित शब्द: फुले, झाडे, पक्षी, फुलपाखरे, खेळ, सुवास / हिरवळ"
    },

    // 7: प्र. ३ (अ) वाक्यप्रचार
    {
      id: "q3_a_vakya",
      type: "short-answer",
      title: "प्र. ३ (अ) खालील वाक्प्रचारांचा अर्थ सांगून वाक्यात उपयोग करा :",
      marks: 2,
      columnsPerRow: 1,
      items: [
        {
          id: "q3_a_1",
          lines: 2,
          content: "भान हरपून जाणे -",
          answer: "अर्थ: मग्न होणे. वाक्य: गाणे ऐकताना मुलांचे भान हरपून गेले."
        },
        {
          id: "q3_a_2",
          lines: 2,
          content: "हेवा वाटणे -",
          answer: "अर्थ: मत्सर वाटणे. वाक्य: समीरच्या यशाचा सर्वांना हेवा वाटला."
        },
        {
          id: "q3_a_3",
          lines: 2,
          content: "हाताची ढाल करणे -",
          answer: "अर्थ: स्वतःचे रक्षण करणे. वाक्य: चेंडू लागू नये म्हणून रोहनने हाताची ढाल केली."
        },
        {
          id: "q3_a_4",
          lines: 2,
          content: "आश्चर्याचा धक्का बसणे -",
          answer: "अर्थ: खूप नवल वाटणे. वाक्य: अचानक समोर वाघ पाहून सर्वांना आश्चर्याचा धक्का बसला."
        },
        {
          id: "q3_a_5",
          lines: 2,
          content: "मन मोकळे करणे -",
          answer: "अर्थ: मनातले बोलून दाखवणे. वाक्य: आईजवळ बसून मी माझे मन मोकळे केले."
        }
      ]
    },

    // 8: ब) समानार्थी शब्द
    {
      id: "q3_b_samanarthi",
      type: "short-answer",
      title: "ब) खालील शब्दांचे समानार्थी शब्द लिहा :",
      marks: 2,
      columnsPerRow: 2,
      items: [
        {
          id: "q3_b_1",
          lines: 0,
          content: "आकाश  =  ____________________",
          answer: "आभाळ / गगन"
        },
        {
          id: "q3_b_2",
          lines: 0,
          content: "नदी  =  ____________________",
          answer: "सरिता"
        },
        {
          id: "q3_b_3",
          lines: 0,
          content: "आश्चर्य  =  ____________________",
          answer: "नवल"
        },
        {
          id: "q3_b_4",
          lines: 0,
          content: "गोष्ट  =  ____________________",
          answer: "कथा / कहाणी"
        }
      ]
    },

    // 9: क) विरुद्धार्थी शब्द
    {
      id: "q3_c_viruddharthi",
      type: "short-answer",
      title: "क) खालील शब्दांचे विरुद्धार्थी शब्द लिहा :",
      marks: 2,
      columnsPerRow: 2,
      items: [
        {
          id: "q3_c_1",
          lines: 0,
          content: "भेद   ×   ____________________",
          answer: "साम्य / एकता"
        },
        {
          id: "q3_c_2",
          lines: 0,
          content: "यश   ×   ____________________",
          answer: "अपयश"
        },
        {
          id: "q3_c_3",
          lines: 0,
          content: "सुंदर   ×   ____________________",
          answer: "कुरूप"
        },
        {
          id: "q3_c_4",
          lines: 0,
          content: "आनंद   ×   ____________________",
          answer: "दुःख"
        }
      ]
    },

    // 10: ड) विरामचिन्हे वापरून वाक्ये पुन्हा लिहा
    {
      id: "q3_d_viramchinhe_vakyet",
      type: "short-answer",
      title: "ड) विरामचिन्हांचा वापर करून वाक्ये पुन्हा लिहा :",
      marks: 2,
      columnsPerRow: 1,
      items: [
        {
          id: "q3_d_1",
          lines: 1,
          content: "अहाहा किती छान शर्ट आहे",
          answer: "अहाहा! किती छान शर्ट आहे!"
        },
        {
          id: "q3_d_2",
          lines: 1,
          content: "तुला गुलाबजाम आवडतो का",
          answer: "तुला गुलाबजाम आवडतो का?"
        }
      ]
    },

    // 11: इ) वर्गीकरण तक्ता
    {
      id: "q3_e_table",
      type: "table",
      title: "इ) खालील शब्दांचे नाम, सर्वनाम, विशेषण व क्रियापद यामध्ये वर्गीकरण करून तक्ता तयार करा :",
      marks: 2,
      hints: "[ चालतो,  वागतो,  माझा,  मला,  हिमालय,  सुंदर,  रंगीबेरंगी,  पळतो,  आंबट,  चविष्ट ]",
      tableRows: [
        ["नाम", ""],
        ["सर्वनाम", ""],
        ["विशेषण", ""],
        ["क्रियापद", ""]
      ],
      tableHeaderCol: true,
      tableHeaderRow: false,
      tableCellMinHeight: 32,
      answerNote: "नाम: हिमालय\nसर्वनाम: माझा, मला\nविशेषण: सुंदर, रंगीबेरंगी, आंबट, चविष्ट\nक्रियापद: चालतो, वागतो, पळतो"
    },

    // 12: प्र. ४ था पत्र लेखन
    {
      id: "q4_patra",
      type: "composition",
      title: "प्र. ४ था तुमच्या मित्राला / मैत्रिणीला निबंध स्पर्धेत प्रथम पारितोषिक मिळाल्याबद्दल अभिनंदन करणारे पत्र लिहा.",
      marks: 5,
      writingLines: 8,
      compositionSentences: [],
      answerNote: "पत्र लेखन: दिनांक, प्रिय मित्र/मैत्रीण, अभिनंदन... तुझा मित्र."
    },

    // 13: प्र. ५ वा निबंध लेखन
    {
      id: "q5_nibandh",
      type: "composition",
      title: "प्र. ५ वा खालीलपैकी कोणत्याही एका विषयावर निबंध लिहा :",
      marks: 5,
      writingLines: 10,
      compositionNumbered: true,
      compositionSentences: [
        "मी पाहिलेले पर्यटन स्थळ",
        "आत्मवृत्त - मी पुस्तक बोलतोय",
        "माझी मायबोली",
        "अभ्यासाचे महत्त्व (किंवा \"माझा रेल्वेचा पहिला प्रवास\")"
      ]
    }
  ]
};

fs.writeFileSync('scratch/paper_61463c3b_updated.json', JSON.stringify(updatedPaper, null, 2));
console.log('Successfully written scratch/paper_61463c3b_updated.json');
