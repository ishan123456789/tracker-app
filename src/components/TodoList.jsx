import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, Typography, Button, IconButton, TextField, Box,
  List, ListItem, ListItemText, Checkbox, Collapse, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Add, Delete, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { TodoItem } from './TodoItem';

const TodoList = () => {
  const todos = useQuery(api.todos.get) || [];
  const addTodo = useMutation(api.todos.add);
  const updateTodo = useMutation(api.todos.update);
  const updateTodoOrder = useMutation(api.todos.updateOrder);
  const removeTodo = useMutation(api.todos.remove);
  const removeOldDoneTodos = useMutation(api.todos.removeOldDone);

  const [newTodo, setNewTodo] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sortBy, setSortBy] = useState('position');

  useEffect(() => {
    const interval = setInterval(() => {
      removeOldDoneTodos();
    }, 60 * 60 * 1000); // Run every hour to clean up old done todos
    return () => clearInterval(interval);
  }, [removeOldDoneTodos]);

  const handleAddTodo = () => {
    if (newTodo.trim() === '') return;
    addTodo({ text: newTodo, deadline: newDeadline });
    setNewTodo('');
    setNewDeadline('');
  };

  const handleToggleTodo = (id, done) => {
    console.log('Toggling todo:', id, done);
    updateTodo({ id, done: !done });
  };

  const handleUpdateDeadline = (id, deadline) => {
    const todo = todos.find(t => t._id === id);
    if (todo) {
      updateTodo({ id, deadline, done: todo.done });
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = activeTodos.findIndex(todo => todo._id === active.id);
      const newIndex = activeTodos.findIndex(todo => todo._id === over.id);
      const newOrder = arrayMove(activeTodos, oldIndex, newIndex);
      const updatedOrder = newOrder.map((todo, index) => ({ ...todo, position: index }));
      updateTodoOrder({ todos: updatedOrder.map(({_id, position}) => ({_id, position})) });
    }
  };

  const activeTodos = todos
    .filter(todo => !todo.done)
    .sort((a, b) => {
      if (sortBy === 'text') {
        return a.text.localeCompare(b.text);
      } else if (sortBy === 'date') {
        return b._creationTime - a._creationTime;
      } else {
        return (a.position || 0) - (b.position || 0);
      }
    });

  const doneTodos = todos.filter(todo => todo.done);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5">Todo List</Typography>
        <Box display="flex" mb={2}>
          <TextField
            label="New Todo"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <TextField
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <Button onClick={handleAddTodo} variant="contained" color="primary">
            Add
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="position">Default</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="text">Text</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeTodos.map(todo => todo._id)} strategy={verticalListSortingStrategy}>
            <List>
              {activeTodos.map(todo => (
                <TodoItem 
                  key={todo._id} 
                  todo={todo} 
                  handleToggleTodo={handleToggleTodo} 
                  removeTodo={removeTodo} 
                  handleUpdateDeadline={handleUpdateDeadline} 
                />
              ))}
            </List>
          </SortableContext>
        </DndContext> */}
        <List>
          {activeTodos.map(todo => (
            <TodoItem 
              key={todo._id} 
              todo={todo} 
              handleToggleTodo={handleToggleTodo} 
              removeTodo={removeTodo} 
              handleUpdateDeadline={handleUpdateDeadline} 
            />
          ))}
        </List>

        {doneTodos.length > 0 && (
          <Box mt={2}>
            <Button onClick={() => setShowHistory(!showHistory)} startIcon={showHistory ? <ExpandLess /> : <ExpandMore />}>
              Todos Done
            </Button>
            <Collapse in={showHistory}>
              <List>
                {doneTodos.map(todo => (
                  <ListItem key={todo._id} dense>
                    <Checkbox
                      edge="start"
                      checked={todo.done}
                      tabIndex={-1}
                      disableRipple
                      onChange={() => handleToggleTodo(todo._id, todo.done)}
                    />
                    <ListItemText primary={todo.text} sx={{ textDecoration: 'line-through' }} />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default TodoList;