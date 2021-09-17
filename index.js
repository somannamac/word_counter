const axios = require('axios');
const fs = require('file-system');

const dataSourceUrl = 'http://norvig.com/big.txt'
const wordInfoURL = 'https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=dict.1.1.20210216T114936Z.e4989dccd61b9626.373cddfbfb8a3b2ff30a03392b4e0b076f14cff9&lang=en-ru&text='
const excludedWords = ['-'];

const getWordInfo = async (word, occuranceCount) => {
    return await axios.get(`${wordInfoURL}${word}`)
        .then(({ data } = {}) => {
            const {
                def: [{ pos = '', tr: [{ mean = [] } = {}] = [] } = {}] = []
            } = data;
            return {
                word,
                occuranceCount,
                synonyms: mean,
                'Part of speech': pos
            };
        }).catch(() => '');
};

const getMostOccuringWords = async (numberOfWordsToCollect = 10) => {
    const apiData = await axios.get(dataSourceUrl)
        .then(({ data } = {}) => data)
        .catch(() => null);

    if (apiData) {
        //Removing special Characters, multiple spaces, newline and tabs. Then converting to array of words.
        const mainStringData = String(apiData).replace(/[^\w\s\'\-]|_/gi, '').replace(/(\r\n|\n|\r|\r\t|\t|\s)/gm, ' ').replace(/ +|--/g, ' ')
        // splitting string using ' ' into an array
        const stringDataArray = String(mainStringData).split(' ')

        // collecting number of occurances of a word
        const occuranceData = {};
        if (stringDataArray && stringDataArray.length) {
            stringDataArray.forEach((stringData) => {
                const word = String(stringData).toLowerCase().trim().replace(/^'/, '').replace(/\/*'$/, '');
                if(word && !excludedWords.includes(word)) {
                    if (occuranceData[word]) {
                        occuranceData[word] += 1;
                    } else {
                        occuranceData[word] = 1;
                    }
                }
            })
        }

        // Converting data collected above to an array and sort based on descending order of occurance
        const occuranceDataArray = [];
        for (word in occuranceData) {
            occuranceDataArray.push([word, occuranceData[word]]);
        }
        const occuranceDataArrayLength = occuranceDataArray.length;
        occuranceDataArray.sort((a, b) => b[1] - a[1]).splice(numberOfWordsToCollect, occuranceDataArrayLength);

        // getting Info of each word from yandex 
        const wordInfoApiData = occuranceDataArray.map((wordData) => getWordInfo(wordData[0], wordData[1]));
        const outputData = await Promise.all(wordInfoApiData);

        fs.writeFile('output.json', JSON.stringify(outputData, null, 4));
    }
};

getMostOccuringWords();
