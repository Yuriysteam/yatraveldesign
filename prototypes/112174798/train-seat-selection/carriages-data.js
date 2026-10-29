/* Carriage and fare data transcribed from the mobile Figma frame 18102:453085.
   Each compartment is [left upper, left lower, right upper, right lower]. */
window.SeatSelectionData = {
  legend: [
    { colorAsset: 'ellipse4827.svg', price: '5 560 ₽' },
    { colorAsset: 'ellipse4826.svg', price: '6 826 ₽' },
  ],
  carriages: [
    {
      number: 1, node: '18102:453115', schemeNode: '18102:453116',
      availability: '5 ниж, 7 верх', separateLeftToilet: true,
      coupes: [
        [null, null, null, null], [null, null, 8, null], [null, 9, 12, null],
        [null, null, 16, null], [null, null, null, null], [22, null, null, 23],
        [26, 25, null, null], [30, null, null, 31], [null, null, 36, 35],
      ],
    },
    {
      number: 2, node: '18102:453234', schemeNode: '18102:453235',
      availability: '5 ниж, 7 верх', separateLeftToilet: true,
      coupes: [
        [null, null, null, null], [null, null, 8, null], [null, 9, 12, null],
        [null, null, 16, null], [null, null, null, null], [22, 21, null, null],
        [null, null, 28, 27], [30, null, null, 31], [null, null, 36, 35],
      ],
    },
    {
      number: 3, node: '18102:453353', schemeNode: '18102:453354',
      availability: '11 ниж, 14 верх', separateLeftToilet: false,
      coupes: [
        [null, null, null, null], [6, 5, 8, 7], [null, null, 12, null],
        [14, 13, 16, 15], [18, null, 20, null], [22, 21, null, null],
        [26, 25, 28, 27], [30, 29, 32, 31], [34, 33, 36, 35],
      ],
    },
    {
      number: 4, node: '18102:453472', schemeNode: '18102:453473',
      availability: '8 ниж, 9 верх', separateLeftToilet: false,
      extraAmenity: ['icons24-genger-cabin-new.svg', 'Мужское и женское купе'],
      // Null means the first buyer chooses the type. Coupe 6 (21–24) is empty.
      genderCabins: {2:'male', 4:'female', 5:'mixed', 6:null, 7:'mixed', 8:'mixed', 9:'mixed'},
      coupes: [
        [null, null, null, null], [6, 5, null, 7], [null, null, null, null],
        [14, 13, null, 15], [null, null, 20, 19], [22, 21, 24, 23],
        [null, null, 28, null], [30, 29, null, null], [34, null, 36, null],
      ],
    },
    {
      number: 5, node: '18102:453599', schemeNode: '18102:453600',
      availability: '10 ниж, 11 верх', separateLeftToilet: true,
      extraAmenity: ['icons24-animal-new.svg', 'Можно с животными'],
      coupes: [
        [2, 1, null, null], [null, null, 8, 7], [null, null, null, null],
        [null, null, 16, 15], [null, null, null, null], [22, 21, 24, 23],
        [26, 25, 28, 27], [30, 29, 32, 31], [34, 33, 36, null],
      ],
    },
  ],
};
