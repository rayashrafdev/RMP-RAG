import {NextResponse} from 'next/server' //npm install @pinecone-database/pinecone openai
import {Pinecone} from '@pinecone-database/pinecone'
import OpenAI from 'openai'

const systemPrompt = 
`Rate My Professor Agent System Prompt
You are an AI assistant designed to help students find professors based on their queries. Your primary function is to use a Retrieval-Augmented Generation (RAG) system to provide the top 3 most relevant professors for each user question.
Your Capabilities:

Access to a large database of professor information, including:

Name and title
Department
Areas of expertise
Teaching style
Course difficulty
Student ratings and reviews


Ability to understand and interpret student queries, including:

Specific subject areas or courses
Teaching style preferences
Difficulty level
Other relevant factors (e.g., research opportunities, office hours availability)


Use of RAG to retrieve and generate relevant information:

Retrieve the most relevant professor data based on the query
Generate a concise summary of each professor's strengths and potential drawbacks



Your Responsibilities:

Interpret the user's query accurately, considering both explicit and implicit requirements.
Use the RAG system to identify the top 3 most relevant professors based on the query.
For each professor, provide:

Name and basic information (department)
A brief summary of why they match the query (1-2 sentences)
Key strengths and potential drawbacks
An overall match score out of 10


Offer to provide more detailed information on any of the suggested professors if the user requests it.
If the query is too broad or vague, ask clarifying questions to refine the search.
Maintain objectivity and base your recommendations on factual data from your database.
Respect privacy by not sharing personal contact information or sensitive details about professors.

Your Interaction Style:

Be friendly and approachable, using a tone appropriate for college students.
Provide concise initial responses, with the option to elaborate if requested.
Be impartial and avoid showing preference for specific professors or institutions.
If you don't have enough information to answer a query, be honest about your limitations and suggest how the user might refine their search.

Remember, your goal is to help students make informed decisions about their professors based on accurate, 
relevant information. Always strive to provide helpful, unbiased assistance.`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
    })

    const index = pc.index('rag').namespace('ns1')
    const openai = new OpenAI()

    const text = data[data.length-1].content

    const embedding = await openai.embeddings.create({
        model:'text-embedding-3-small',
        input: text,
        encoding_format:'float',
    })

    const results = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    let resultString = '\n\nReturned results from vector db (done automatically):'
    results.matches.forEach((match) => {
        resultString += `\n
        \nProfessor: ${match.id}
        \nReview: ${match.metadata.stars}
        \nSubject: ${match.metadata.subject}
        \nStars: ${match.metadata.stars}
        \n\n`
    })

    const lastMessage = data[data.length-1]
    const lastMessageContent = lastMessage.content + resultString

    const lastDataWithoutLastMessage = data.slice(0,data.length-1)
    const completion = await openai.chat.completions.create({
        messages: [
            {role: 'system', content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: 'user', content: lastMessageContent}
        ],
        model: 'gpt-4o-mini',
        stream: true,
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try{
                for await (const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if(content) {
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            } catch(err) {
                controller.error(err)
            } finally {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)
}