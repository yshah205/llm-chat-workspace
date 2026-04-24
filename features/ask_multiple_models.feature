Feature: Multi-turn conversation workflow
  As a user
  I want to create a conversation and continue chatting
  So that I can get assistant responses with context

  Scenario: create thread and send message
    Given the chat API server is running
    When I create a new conversation thread
    And I send a message "What is Agile?"
    Then I should receive user and assistant messages

  Scenario: regenerate an assistant response
    Given the chat API server is running
    When I create a new conversation thread
    And I send a message "Explain API latency."
    And I regenerate the assistant response
    Then the conversation should include at least two assistant messages
