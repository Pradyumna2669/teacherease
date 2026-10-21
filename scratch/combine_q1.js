const fs = require('fs');

const paper = JSON.parse(fs.readFileSync('scratch/paper_61463c3b_updated.json', 'utf8'));

// The 1st passage question (comprehension)
const q1 = paper.questions[0];

// Sub-items for Q1
q1.marks = 10;
q1.title = "प्र. १ ला पुढील उतारा वाचून दिलेल्या सूचनांनुसार कृती करा :";
q1.items = [
  {
    id: "q1_sub_1",
    lines: 0,
    content: "चौकटी पूर्ण करा :  (२ गुण)\nअ) ओवी आजोबांबरोबर गावात गेलेली ते ठिकाण  [ ___________________________ ]\nब) कथा, काव्य, नाट्य यांचा सुंदर मिलाप म्हणजे  [ ___________________________ ]",
    answer: "अ) देवळात (कीर्तन ऐकायला)\nब) कीर्तन"
  },
  {
    id: "q1_sub_2",
    lines: 0,
    content: "कोण कोणास म्हणाले ? ते लिहा :  (१ गुण)\n\"मी इथे खूप मजा करत आहे.\" - ____________________________________",
    answer: "ओवी आईला म्हणाली."
  },
  {
    id: "q1_sub_3",
    lines: 0,
    content: "कारण लिहा :  (१ गुण)\nदेवळात दोन तास कसे गेले ते ओवीला समजले नाही कारण - ____________________________________",
    answer: "कीर्तनाचा कार्यक्रम एवढा रंगला, की सगळे जण कीर्तनात दंग होऊन गेले होते."
  },
  {
    id: "q1_sub_4",
    lines: 3,
    content: "स्वमत :  (३ गुण)\nओवीने दरवर्षी सुट्टीत गावाला यायचे का ठरवले असावे ते तुमच्या शब्दात लिहा.",
    answer: "ओवीला गावातील हिरवेगार डोंगर, वाहणारी नदी, शेते व निसर्गाचे सुंदर रूप खूप आवडले. आजीच्या हातची चविष्ट भाजीभाकरी आणि देवळातील कीर्तनाचा आनंद तिला मिळाला, म्हणून तिने दरवर्षी सुट्टीत गावाला यायचे ठरवले."
  },
  {
    id: "q1_sub_5",
    lines: 0,
    content: "चौकटी पूर्ण करा :  (२ गुण)\nअ) आजीने मुलाला दिलेला खाऊ  ➞  [ ________________________________ ]\nब) आजी मुलाला लाडाने म्हणते  ➞  [ ________________________________ ]",
    answer: "अ) धपाटे / लाडू\nब) लखोबा / राजा"
  },
  {
    id: "q1_sub_6",
    lines: 0,
    content: "विरामचिन्हे ओळखा आणि लिहा :  (१ गुण)\n[  ,  ]   _________________          [  !  ]   _________________          [  ?  ]   _________________",
    answer: "स्वल्पविराम, उद्गारचिन्ह, प्रश्नचिन्ह"
  }
];

// Now remove old Q1 (swamat), Q2 (aaji boxes), Q3 (viramchinhe) which were indices 1, 2, 3
// Remaining questions start from old index 4 (प्र. २ अ प्रश्नांची उत्तरे)
const remainingQuestions = paper.questions.slice(4);

const newQuestions = [q1, ...remainingQuestions];

paper.questions = newQuestions;

fs.writeFileSync('scratch/paper_61463c3b_combined_q1.json', JSON.stringify(paper, null, 2));

console.log('Total questions now:', paper.questions.length);
paper.questions.forEach((q, i) => {
  console.log(`Q${i+1} [${q.type}] - marks: ${q.marks} - items: ${q.items.length} - ${q.title.slice(0, 45)}`);
});
