'use client'
import { useState, useEffect } from 'react'
import Image from "next/image";
import styles from "./page.module.css";
import { 
  Box, 
  Stack, 
  TextField, 
  Button,
  Typography
} from "@mui/material";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the RMP support assistant. How can I help you today?"
    }
  ])

  const [message, setMessage] = useState('')

  const sendMessage = async () => {
    if (!message.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '' }
    ];

    setMessages(newMessages);
    setMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          "Content-Type": 'application/json'
        },
        body: JSON.stringify(newMessages)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        accumulatedContent += text;

        // Format the accumulated content
        const formattedContent = formatContent(accumulatedContent);

        setMessages(prevMessages => {
          const lastMessage = prevMessages[prevMessages.length - 1];
          return [
            ...prevMessages.slice(0, -1),
            { ...lastMessage, content: formattedContent }
          ];
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prevMessages => [
        ...prevMessages,
        { role: "assistant", content: "Sorry, there was an error processing your request." }
      ]);
    }
  }

  const formatContent = (content) => {
    // Split the content into sections
    const sections = content.split(/(\d+\.\s*\*\*[\w\s]+\*\*)/);
    
    // Process each section
    return sections.map((section, index) => {
      if (index % 2 === 1) {
        // This is a professor header
        return "\n\n" + section + "\n";
      } else {
        // This is the professor details
        return section.replace(/- \*\*/g, "\n• ")  // Replace bullet points
                      .replace(/\*\*/g, "")       // Remove remaining asterisks
                      .replace(/\n\s+/g, "\n")    // Remove extra spaces at start of lines
                      .trim();                    // Trim extra whitespace
      }
    }).join('');
  }

  return (
    <Box width="100vw" height="100vh" display="flex" flexDirection="column" justifyContent="center" alignItems="center">
      <Stack direction="column" width="500px" height="700px" border="1px solid black" p={2} spacing={3}>
        <Stack direction="column" spacing={2} flexGrow={1} overflow='auto' maxHeight='100%'>
          {messages.map((message, index) => (
            <Box key={index} display="flex" justifyContent={message.role === "assistant" ? "flex-start" : "flex-end"}>
              <Box 
                bgcolor={message.role === "assistant" ? "primary.main" : "secondary.main"}
                color="white" 
                borderRadius={3} 
                p={2}
                maxWidth="80%"
              >
                <Typography style={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField 
            label="Message" 
            fullWidth 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
          />
          <Button variant='contained' onClick={sendMessage}>Send</Button>
        </Stack>
      </Stack>
    </Box>
  );
}