# Product Requirements Document: Todo Tracker

## 1. Introduction

The new "Todo" tracker will allow users to create and manage todo lists within the application. This will provide users with a centralized location to manage all of their tasks, both for their tracked activities and for their general to-do items.

## 2. Problem Statement

Users currently have to use a separate application to manage their todo lists. This is inconvenient and makes it difficult to keep track of all of their tasks in one place. The lack of an integrated todo list feature reduces the overall utility of the application as a comprehensive personal tracker.

## 3. Goals and Objectives

- Allow users to create and manage todo lists.
- Provide a clear and intuitive user interface for managing todo lists.
- Integrate the new "Todo" tracker seamlessly with the existing application.
- Increase user engagement by providing a more comprehensive and useful application.

## 4. User Stories

- As a user, I want to be able to add items to my todo list.
- As a user, I want to be able to mark items on my todo list as complete.
- As a user, I want to be able to see a history of my completed todo items.
- As a user, I want to be able to quickly preview, check, and uncheck my done items.
- As a user, I want to see that my done items are removed from the todo list within 24 hours of being checked.
- As a user, I want to be able to sort my todo items.
- As a user, I want to be able to reorder my todo items by dragging and dropping them.
- As a user, I want to be able to add a deadline to my todo items.
- As a user, I want to see my active todo items that are past their deadline highlighted, so that I can prioritize them.

## 5. Requirements

- The todo list will be available by default on the main page.
- There will be no need to add a "Todo" section.
- Users will be able to add new todo items via a text input field.
- Each todo item will have a checkbox to mark it as complete.
- When a todo item is marked as complete, it will be visually distinguished (e.g., with a line-through style).
- Completed todo items will be moved to a "Todos done" history section at the bottom of the todo list.
- The "Todos done" history section will be collapsible, allowing users to show or hide the list of completed items.
- Users will be able to uncheck items in the "Todos done" history, which will move them back to the active todo list.
- Completed todo items will be automatically removed from the "Todos done" history after 24 hours.
- Users will be able to sort the todo items by text (alphabetically) or by creation date.
- Users will be able to reorder the todo items by dragging and dropping them.
- Each todo item will have an optional deadline.
- The deadline will be displayed next to the todo item.
- Active todo items that are past their deadline will be highlighted with a different color (e.g., red).

## 6. Out of Scope

- The ability to add notes or descriptions to todo items.
- The ability to share todo lists with other users.
- The ability to create recurring todo items.
