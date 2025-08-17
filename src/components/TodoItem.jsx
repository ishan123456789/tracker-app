import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ListItem, ListItemText, Checkbox, IconButton, TextField } from '@mui/material';
import { Delete } from '@mui/icons-material';

export const TodoItem = ({ todo, handleToggleTodo, removeTodo, handleUpdateDeadline }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: todo._id });

  const isPastDeadline = todo.deadline && new Date(todo.deadline) < new Date();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isPastDeadline && !todo.done ? '#ffcdd2' : 'transparent',
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      dense
    >
      <Checkbox
        edge="start"
        checked={todo.done}
        tabIndex={-1}
        disableRipple
        onChange={() => handleToggleTodo(todo._id, todo.done)}
      />
      <ListItemText primary={todo.text} />
      <TextField
        type="date"
        value={todo.deadline || ''}
        onChange={(e) => handleUpdateDeadline(todo._id, e.target.value)}
        variant="standard"
        sx={{ mr: 2 }}
      />
      <IconButton edge="end" aria-label="delete" onClick={() => removeTodo({ id: todo._id })}>
        <Delete />
      </IconButton>
    </ListItem>
  );
};